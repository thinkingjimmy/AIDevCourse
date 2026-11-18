import 'server-only';
import { cache } from 'react';
import snapshot from '@catalog';
import type { Catalog } from '../model';
import { globalAchievementCourses } from '../model';
import type { Locale } from '../../i18n/config';
import { coursePath } from '../../i18n/routing';
export function getCatalog(): Catalog {
  if ('error' in snapshot) throw new Error(String(snapshot.error));
  return snapshot as Catalog;
}
export const getCourses = cache((lang: Locale) => getCatalog().courses.filter(course => course.locale === lang));
export function getAchievementCourses(lang: Locale) { return globalAchievementCourses(getCatalog(), lang); }
export function getCourse(lang: Locale, slug: string) { return getCourses(lang).find((course) => course.slug === slug); }
export function getLesson(lang: Locale, course: string, slug: string[]) {
  const url = coursePath(lang, course, slug.join('/'));
  return getCatalog().documents.find((doc) => doc.locale === lang && doc.courseSlug === course && doc.data.kind === 'lesson' && doc.url === url);
}
