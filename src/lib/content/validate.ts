/**
 * [INPUT]: Parsed language documents, explicit order, and local public assets.
 * [OUTPUT]: Identity, unique lesson-slug, and revision validation, plus public catalog rules and safe links.
 * [POS]: Central publication policy used before any route, search, or SEO output.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { identity, type ContentDocument } from './types';
import { isLocale, languageNames, type Locale } from '../i18n/config';

export function publishDocuments(documents: ContentDocument[], order: Map<Locale, string[]>) {
  const byKey = new Map<string, ContentDocument>();
  const byURL = new Map<string, ContentDocument>();
  const courses = documents.filter((doc) => doc.data.kind === 'course');
  const warnings: string[] = [];
  const fail = (doc: ContentDocument, reason: string): never => { throw new Error(`${doc.file}: ${reason}`); };
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
    const sourceRevision = original.data.contentRevision;
    if (!sourceRevision || original.data.translatedFromRevision !== undefined) fail(original, 'Original requires contentRevision only');
    if (doc.locale !== parent.data.sourceLocale) {
      if (!doc.data.translatedFromRevision || doc.data.contentRevision !== undefined) fail(doc, 'Translation requires translatedFromRevision only');
      if (doc.data.translatedFromRevision! > sourceRevision!) fail(doc, 'Translation references a future revision');
      doc.stale = doc.data.translatedFromRevision! < sourceRevision!;
      if (doc.stale) warnings.push(`${doc.file}: translation revision ${doc.data.translatedFromRevision} is behind ${sourceRevision}`);
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
  const visible = documents;
  for (const course of visible.filter((doc) => doc.data.kind === 'course')) {
    if (!visible.some((doc) => doc.locale === course.locale && doc.data.kind === 'lesson' && doc.data.courseId === course.data.courseId)) {
      fail(course, 'Published course must contain at least one public lesson');
    }
  }
  return { visible, warnings };
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
      if (!link.url.startsWith('/') && !link.url.startsWith('#')) fail('Use final language-prefixed links or local anchors');
      const [path, fragment] = link.url.split('#');
      const targetPath = path || doc.url;
      const target = byURL.get(targetPath);
      const locale = targetPath.split('/')[1];
      if (!isLocale(locale)) fail('Invalid target language');
      const simplePage = new RegExp(`^/${locale}(?:/courses|/about)?$`).test(targetPath);
      if (!target && !simplePage) fail('Target is missing');
      if (fragment && !target?.headings.some((heading) => heading.id === decodeURIComponent(fragment))) fail('Missing heading anchor');
      if (locale !== doc.locale && !link.label.includes(languageNames[locale as Locale])) fail('Cross-language links must name their target language');
    }
  }
}
