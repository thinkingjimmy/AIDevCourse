/**
 * [INPUT]: Mode-specific catalog and Fumadocs MDX aliases, plus locale configuration, canonical locale paths.
 * [OUTPUT]: Explicit-language course/lesson queries by public URL, and compiled article lookup by file path.
 * [POS]: Server-only facade; public consumers cannot bypass the catalog.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import 'server-only';
import { cache } from 'react';
import { loader } from 'fumadocs-core/source';
import { courses } from '@source';
import publicCatalog from '@catalog';
import type { Catalog } from './model';
import { locales, defaultLocale, type Locale } from '../i18n/config';
import { localePath } from '../i18n/routing';
export const getCatalog = cache(() => publicCatalog as Catalog);
const compiled = loader({
  baseUrl: '/courses', source: courses.toFumadocsSource(),
  i18n: { languages: [...locales], defaultLanguage: defaultLocale, parser: 'dir', hideLocale: 'default-locale', fallbackLanguage: null },
});
export function getCourses(lang: Locale) { return getCatalog().courses.filter((course) => course.locale === lang); }
export function getCourse(lang: Locale, slug: string) { return getCourses(lang).find((course) => course.slug === slug); }
export function getLesson(lang: Locale, course: string, slug: string[]) {
  const url = localePath(lang, `/courses/${course}/${slug.join('/')}`);
  return getCatalog().documents.find((doc) => doc.locale === lang && doc.courseSlug === course && doc.data.kind === 'lesson' && doc.url === url);
}
export function getArticle(lang: Locale, course: string, slug: string[] = []) {
  const url = localePath(lang, `/courses/${course}${slug.length ? `/${slug.join('/')}` : ''}`);
  const doc = getCatalog().documents.find((item) => item.locale === lang && item.url === url);
  if (!doc) return undefined;
  const page = compiled.getPage([course, ...doc.slug], lang);
  const fileUrl = localePath(lang, `/courses/${course}${doc.slug.length ? `/${doc.slug.join('/')}` : ''}`);
  // Fumadocs may provide language fallback; the public catalog above never does.
  if (!page || page.url !== fileUrl) return undefined;
  return page;
}
