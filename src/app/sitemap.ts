import { localePath } from '@/lib/i18n/routing';
import type { MetadataRoute } from 'next';
import { getCatalog } from '@/lib/content/source';
import { identity } from '@/lib/content/model';
import { locales } from '@/lib/i18n/config';
import { alternates } from '@/lib/metadata';
import { site } from '@/lib/site-config';
import { vocabularyCollections } from '@/lib/vocabulary/collections';
export default function sitemap(): MetadataRoute.Sitemap {
  const vocabularyPaths = Object.values(vocabularyCollections).flatMap(collection => collection.categories.map(category => `${collection.path}/${category.id}`));
  const entries = [...locales.flatMap((locale) => ['', '/about', ...vocabularyPaths].map((part) => ({ locale, url: localePath(locale, part || '/'), id: undefined as string | undefined }))), ...getCatalog().documents.map((doc) => ({ locale: doc.locale, url: doc.url, id: identity(doc) }))];
  return entries.map((entry) => ({ url: new URL(entry.url, site.origin).href, alternates: { languages: Object.fromEntries(Object.entries(alternates(entry.url, entry.id).languages).map(([key, url]) => [key, new URL(url, site.origin).href])) } }));
}
