import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { identity, renderedAnchors, type ContentDocument } from './model';
import { languageNames, type Locale } from '../i18n/config';
import { localePath, pathLocale, stripLocale } from '../i18n/routing';

export function publishDocuments(documents: ContentDocument[], order: Map<Locale, string[]>) {
  const byKey = new Map<string, ContentDocument>();
  const byURL = new Map<string, ContentDocument>();
  const courses = documents.filter((doc) => doc.data.kind === 'course');
  const fail = (doc: ContentDocument, reason: string): never => { throw new Error(`${doc.file}: ${reason}`); };
  const achievementIds = new Set<string>();
  const lessonSlugs = new Map<string, ContentDocument>();
  for (const doc of documents) {
    const key = `${doc.locale}:${identity(doc)}`;
    if (byKey.has(key)) fail(doc, `Duplicate identity ${key}`);
    if (doc.data.kind === 'lesson') {
      const name = doc.slug[doc.slug.length - 1];
      const slugKey = `${doc.locale}:${doc.courseSlug}:${name}`;
      if (lessonSlugs.has(slugKey)) fail(doc, `Duplicate lesson slug ${name}`);
      lessonSlugs.set(slugKey, doc);
    }
    if (byURL.has(doc.url)) fail(doc, `Duplicate URL ${doc.url}`);
    if (doc.data.kind === 'course' && doc.achievements.length) fail(doc, 'Achievements belong in lesson articles');
    for (const achievement of doc.achievements) {
      const achievementKey = `${doc.locale}:${doc.data.courseId}:${achievement.id}`;
      if (achievementIds.has(achievementKey)) fail(doc, `Duplicate achievement ID ${achievement.id}`);
      achievementIds.add(achievementKey);
    }
    byKey.set(key, doc);
    byURL.set(doc.url, doc);
  }
  const parentOf = (doc: ContentDocument) => {
    const parent = byKey.get(`${doc.locale}:${doc.data.courseId}`);
    if (!parent || parent.data.kind !== 'course' || parent.courseSlug !== doc.courseSlug) fail(doc, 'Missing or mismatched course ownership');
    return parent!;
  };
  const sourceOf = (doc: ContentDocument) => {
    const parent = parentOf(doc);
    if (parent.data.kind !== 'course') throw new Error('Expected course');
    const original = byKey.get(`${parent.data.sourceLocale}:${identity(doc)}`);
    if (!original) fail(doc, 'Missing original identity');
    return original!;
  };
  for (const doc of documents) {
    const original = sourceOf(doc);
    const parent = parentOf(doc);
    const originalParent = parentOf(original);
    if (parent.data.kind !== 'course' || originalParent.data.kind !== 'course') throw new Error('Expected course');
    if (parent.data.sourceLocale !== originalParent.data.sourceLocale) fail(doc, 'Inconsistent sourceLocale');
    if (original.courseSlug !== doc.courseSlug || original.slug.join('/') !== doc.slug.join('/')) fail(doc, 'Translation path must match its original');
    if (doc !== original) for (const achievement of doc.achievements) {
      const source = original.achievements.find((item) => item.id === achievement.id);
      if (!source) fail(doc, `Unknown translated achievement ID ${achievement.id}`);
      if (source!.answer !== achievement.answer || source!.options.map((item) => item.value).sort().join(',') !== achievement.options.map((item) => item.value).sort().join(',')) {
        fail(doc, `Translated achievement options and answer must match the original: ${achievement.id}`);
      }
    }
    doc.sourceUrl = original.url;
  }
  for (const course of courses) {
    const source = sourceOf(course);
    if (course.locale === source.locale) continue;
    const originalOrder = (order.get(source.locale) ?? []).filter((file) => file.startsWith(`${source.locale}/${source.courseSlug}/`));
    const localOrder = (order.get(course.locale) ?? []).filter((file) => file.startsWith(`${course.locale}/${course.courseSlug}/`));
    let previous = -1;
    for (const file of localOrder) {
      const doc = documents.find((candidate) => candidate.file === file)!;
      const position = originalOrder.indexOf(sourceOf(doc).file);
      if (position < 0 || position <= previous) fail(doc, 'Translation order must be an original-order subsequence');
      previous = position;
    }
  }
  return documents;
}

export function validateReferences(documents: ContentDocument[], publicRoot: string) {
  const byURL = new Map(documents.map((doc) => [doc.url, doc]));
  for (const doc of documents) {
    for (const link of doc.links) {
      const fail = (reason: string): never => { throw new Error(`${doc.file}: ${reason}: ${link.url}`); };
      if (/^(https?:|mailto:)/i.test(link.url) && !link.image) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(link.url) || link.url.startsWith('//') || link.url.includes('\\')) fail('Unsafe or unsupported URL');
      if (link.image) {
        if (!link.url.startsWith('/images/')) fail('Images must use a local /images/ path');
        const path = resolve(publicRoot, `.${decodeURIComponent(link.url)}`);
        if (!path.startsWith(resolve(publicRoot) + sep) || !existsSync(path)) fail('Missing or invalid image');
        continue;
      }
      if (!link.url.startsWith('/') && !link.url.startsWith('#')) fail('Use canonical site paths or local anchors');
      const [path, fragment] = link.url.split('#');
      const targetPath = path || doc.url;
      const target = byURL.get(targetPath);
      const locale = pathLocale(targetPath);
      if (targetPath !== localePath(locale, stripLocale(targetPath))) fail('Use the canonical language path');
      const simplePage = targetPath === localePath(locale) || targetPath === localePath(locale, '/about');
      if (!target && !simplePage) fail('Target is missing');
      if (fragment && (!target || !renderedAnchors(target).includes(decodeURIComponent(fragment)))) fail('Missing heading anchor');
      if (locale !== doc.locale && !link.label.includes(languageNames[locale])) fail('Cross-language links must name their target language');
    }
  }
}
