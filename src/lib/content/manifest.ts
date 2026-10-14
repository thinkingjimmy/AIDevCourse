/**
 * [INPUT]: Filesystem scan, publication policy, and explicit ordering.
 * [OUTPUT]: One public catalog with localized manifests and translation maps.
 * [POS]: Framework-independent content builder shared by checks and the app.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { scanContent, contentRoot } from './scan';
import { publishDocuments, validateReferences } from './validate';
import { identity, type Catalog, type CourseManifest, type LessonSummary } from './types';

export function readCatalog(options: { root?: string; publicRoot?: string } = {}): Catalog {
  const scan = scanContent(options.root ?? contentRoot());
  const { visible, warnings } = publishDocuments(scan.documents, scan.order);
  validateReferences(visible, options.publicRoot ?? join(process.cwd(), 'public'));
  const courses: CourseManifest[] = [];
  const translations: Catalog['translations'] = {};
  for (const document of visible) {
    (translations[identity(document)] ??= []).push({ locale: document.locale, url: document.url, headings: document.headings.map((heading) => heading.id) });
    if (document.data.kind !== 'course') continue;
    const course = document.data;
    const localOrder = scan.order.get(document.locale) ?? [];
    const lessons = visible.filter((doc) => doc.locale === document.locale && doc.data.courseId === course.courseId && doc.data.kind === 'lesson')
      .sort((a, b) => localOrder.indexOf(a.file) - localOrder.indexOf(b.file))
      .map((doc): LessonSummary => {
        if (doc.data.kind !== 'lesson') throw new Error('Expected lesson');
        const modulePath = doc.slug.slice(0, -1).join('/');
        return { id: doc.data.lessonId, title: doc.data.title, description: doc.data.description, url: doc.url,
          durationMinutes: doc.data.durationMinutes, type: doc.data.lessonType, module: modulePath,
          moduleTitle: scan.labels.get(`${doc.locale}/${doc.courseSlug}${modulePath ? `/${modulePath}` : ''}`) ?? course.title };
      });
    courses.push({ id: course.courseId, locale: document.locale, slug: document.courseSlug, title: course.title,
      description: course.description, url: document.url, sourceLocale: course.sourceLocale, level: course.level,
      goals: course.goals, audience: course.audience, prerequisites: course.prerequisites,
      lessons, durationMinutes: lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0) });
  }
  courses.sort((a, b) => (scan.order.get(a.locale)?.indexOf(visible.find((doc) => doc.url === a.url)!.file) ?? 0) -
    (scan.order.get(b.locale)?.indexOf(visible.find((doc) => doc.url === b.url)!.file) ?? 0));
  const version = createHash('sha256').update(JSON.stringify(visible)).digest('hex').slice(0, 12);
  return { documents: visible, courses, translations, warnings, version };
}
