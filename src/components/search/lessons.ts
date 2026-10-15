/**
 * [INPUT]: Public catalog and one locale.
 * [OUTPUT]: Lesson URL to display meta (number, title, module, minutes) for search rows.
 * [POS]: Shared by the server header and the client search dialog.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { Locale } from '@/lib/i18n/config';
import type { Catalog } from '@/lib/content/types';
export type SearchLessonMeta = { number: string; title: string; module: string; minutes: number };
export function lessonIndex(catalog: Catalog, locale: Locale) {
  const lessons: Record<string, SearchLessonMeta> = {};
  for (const course of catalog.courses) {
    if (course.locale !== locale) continue;
    course.lessons.forEach((lesson, index) => {
      lessons[lesson.url] = { number: String(index + 1).padStart(2, '0'), title: lesson.title, module: lesson.moduleTitle, minutes: lesson.durationMinutes };
    });
  }
  return lessons;
}
