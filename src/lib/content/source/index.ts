import 'server-only';
import { cache } from 'react';
import { readCatalogSnapshot } from '@catalog-reader';
import { globalAchievementCourses } from '../model';
import type { Locale } from '../../i18n/config';
import { localePath } from '../../i18n/routing';
// MDX hot reloads independently of the catalog generated at startup.
export const getCatalog = cache(readCatalogSnapshot);
export function getCourses(lang: Locale) { return getCatalog().courses.filter((course) => course.locale === lang); }
export function getAchievementCourses(lang: Locale) { return globalAchievementCourses(getCatalog(), lang); }
export function getCourse(lang: Locale, slug: string) { return getCourses(lang).find((course) => course.slug === slug); }
export function getLesson(lang: Locale, course: string, slug: string[]) {
  const url = localePath(lang, `/courses/${course}/${slug.join('/')}`);
  return getCatalog().documents.find((doc) => doc.locale === lang && doc.courseSlug === course && doc.data.kind === 'lesson' && doc.url === url);
}
