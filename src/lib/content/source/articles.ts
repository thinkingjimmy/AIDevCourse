import 'server-only';
import { courses } from '@source';
import type { Locale } from '../../i18n/config';
import { localePath } from '../../i18n/routing';
import { getCatalog } from './index';

export function getArticle(lang: Locale, course: string, slug: string[] = []) {
  const url = localePath(lang, `/courses/${course}${slug.length ? `/${slug.join('/')}` : ''}`);
  const doc = getCatalog().documents.find((item) => item.locale === lang && item.url === url);
  // Read the live collection on each request so hot reload can replace its article loaders.
  return doc ? courses.find(article => article.info.path === doc.file) : undefined;
}
