import type { Locale } from '@/lib/i18n/config';
import type { Catalog } from '@/lib/content/model';
export type SearchLessonMeta = { number: string; title: string; module: string };
export function lessonIndex(catalog: Catalog, locale: Locale) {
  const lessons: Record<string, SearchLessonMeta> = {};
  for (const course of catalog.courses) {
    if (course.locale !== locale) continue;
    course.lessons.forEach((lesson, index) => {
      lessons[lesson.url] = { number: String(index + 1).padStart(2, '0'), title: lesson.title, module: lesson.moduleTitle };
    });
  }
  return lessons;
}
