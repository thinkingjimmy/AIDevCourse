/**
 * [INPUT]: Public catalog, generated Fumadocs MDX, and locale configuration.
 * [OUTPUT]: Explicit-language course/lesson queries and compiled article lookup.
 * [POS]: Server-only facade; public consumers cannot bypass the catalog.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import 'server-only';
import { cache } from 'react';
import { loader } from 'fumadocs-core/source';
import { courses } from '@source';
import publicCatalog from '../../../.source/catalog.json';
import type { Catalog } from './types';
import { locales, defaultLocale, type Locale } from '../i18n/config';
export const getCatalog = cache(() => publicCatalog as Catalog);
const compiled = loader({
  baseUrl: '/courses', source: courses.toFumadocsSource(),
  i18n: { languages: [...locales], defaultLanguage: defaultLocale, parser: 'dir', hideLocale: 'never', fallbackLanguage: null },
});
export function getCourses(lang: Locale) { return getCatalog().courses.filter((course) => course.locale === lang); }
export function getCourse(lang: Locale, slug: string) { return getCourses(lang).find((course) => course.slug === slug); }
export function getOrderedLessons(lang: Locale, slug: string) { return getCourse(lang, slug)?.lessons ?? []; }
export function getLesson(lang: Locale, course: string, slug: string[]) {
  return getCatalog().documents.find((doc) => doc.locale === lang && doc.courseSlug === course && doc.data.kind === 'lesson' && doc.slug.join('/') === slug.join('/'));
}
export function getArticle(lang: Locale, course: string, slug: string[] = []) {
  const url = `/${lang}/courses/${course}${slug.length ? `/${slug.join('/')}` : ''}`;
  if (!getCatalog().documents.some((doc) => doc.url === url)) return undefined;
  const page = compiled.getPage([course, ...slug], lang);
  // Fumadocs may provide language fallback; the public catalog above never does.
  if (!page || page.url !== url) return undefined;
  return page;
}
