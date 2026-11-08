import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { scanContent, contentRoot } from './scan';
import { publishDocuments, validateReferences } from './validate';
import { courseCompletionAchievementId, identity, renderedAnchors, type Catalog, type CourseAchievement, type CourseManifest, type LessonSummary } from './model';

export function readCatalog(options: { root?: string; publicRoot?: string } = {}): Catalog {
  const scan = scanContent(options.root ?? contentRoot());
  const visible = publishDocuments(scan.documents, scan.order);
  validateReferences(visible, options.publicRoot ?? join(process.cwd(), 'public'));
  const courses: CourseManifest[] = [];
  const translations: Catalog['translations'] = {};
  for (const document of visible) {
    (translations[identity(document)] ??= []).push({ locale: document.locale, url: document.url, headings: renderedAnchors(document) });
    if (document.data.kind !== 'course') continue;
    const course = document.data;
    const localOrder = scan.order.get(document.locale) ?? [];
    const lessons = visible.filter((doc) => doc.locale === document.locale && doc.data.courseId === course.courseId && doc.data.kind === 'lesson')
      .sort((a, b) => localOrder.indexOf(a.file) - localOrder.indexOf(b.file))
      .map((doc): LessonSummary => {
        if (doc.data.kind !== 'lesson') throw new Error('Expected lesson');
        const modulePath = doc.slug.slice(0, -1).join('/');
        return { id: doc.data.lessonId, title: doc.data.title, description: doc.data.description, url: doc.url,
          module: modulePath,
          moduleTitle: scan.labels.get(`${doc.locale}/${doc.courseSlug}${modulePath ? `/${modulePath}` : ''}`) ?? course.title };
      });
    const sourceOrder = scan.order.get(course.sourceLocale) ?? [];
    const achievements: CourseAchievement[] = visible.filter((doc) => doc.locale === course.sourceLocale && doc.data.courseId === course.courseId && doc.data.kind === 'lesson')
      .sort((a, b) => sourceOrder.indexOf(a.file) - sourceOrder.indexOf(b.file))
      .flatMap((doc) => doc.achievements.map((achievement) => {
        const lessonId = doc.data.kind === 'lesson' ? doc.data.lessonId : '';
        const translated = visible.find((item) => item.locale === document.locale && item.data.courseId === course.courseId &&
          item.data.kind === 'lesson' && item.data.lessonId === lessonId);
        const localAchievement = translated?.achievements.find((item) => item.id === achievement.id);
        return { kind: 'exercise' as const, id: achievement.id, lessonId, title: localAchievement?.title ?? achievement.title,
          url: `${localAchievement ? translated!.url : doc.url}#achievement-${achievement.id}` };
      }));
    if (course.section !== 'introduction' && (course.level === 'beginner' || course.level === 'intermediate')) {
      achievements.push({ kind: 'course-completion', id: courseCompletionAchievementId, title: course.title, url: document.url });
    }
    courses.push({ id: course.courseId, locale: document.locale, slug: document.courseSlug, title: course.title,
      description: course.description, url: document.url, sourceLocale: course.sourceLocale, level: course.level, section: course.section,
      goals: course.goals, audience: course.audience, prerequisites: course.prerequisites,
      lessons, achievements });
  }
  courses.sort((a, b) => (scan.order.get(a.locale)?.indexOf(visible.find((doc) => doc.url === a.url)!.file) ?? 0) -
    (scan.order.get(b.locale)?.indexOf(visible.find((doc) => doc.url === b.url)!.file) ?? 0));
  const version = createHash('sha256').update(JSON.stringify(visible)).digest('hex').slice(0, 12);
  return { documents: visible, courses, translations, version };
}
