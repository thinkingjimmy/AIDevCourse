import { localePath } from '@/lib/i18n/routing';
import type { MetadataRoute } from 'next';
import { getCatalog } from '@/lib/content/source';
import { hasDocumentPage, identity } from '@/lib/content/model';
import { locales } from '@/lib/i18n/config';
import { alternates } from '@/lib/metadata';
import { site } from '@/lib/site-config';
import { vocabularyCollections, vocabularyPagePaths } from '@/lib/vocabulary/collections';
export default function sitemap(): MetadataRoute.Sitemap {
  const vocabularyPaths = Object.values(vocabularyCollections).flatMap(collection => vocabularyPagePaths(collection.id));
  const documents = getCatalog().documents.filter(hasDocumentPage).map(doc => ({ locale: doc.locale, url: doc.url, id: identity(doc) }));
  const entries = [...locales.flatMap((locale) => ['', '/about', ...vocabularyPaths].map((part) => ({ locale, url: localePath(locale, part || '/'), id: undefined as string | undefined }))), ...documents];
  return entries.map((entry) => ({ url: new URL(entry.url, site.origin).href, alternates: { languages: Object.fromEntries(Object.entries(alternates(entry.url, entry.id).languages).map(([key, url]) => [key, new URL(url, site.origin).href])) } }));
}
