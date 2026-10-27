/**
 * [INPUT]: Public catalog and the same alternate-link derivation as metadata, canonical locale paths.
 * [OUTPUT]: Actual public language URLs and reciprocal hreflang entries.
 * [POS]: Search-engine discovery boundary; lists catalogued lessons and skips redirects.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { localePath } from '@/lib/i18n/routing';
import type { MetadataRoute } from 'next';
import { getCatalog } from '@/lib/content/source';
import { identity } from '@/lib/content/model';
import { locales } from '@/lib/i18n/config';
import { alternates } from '@/lib/metadata';
import { site } from '@/lib/site-config';
export default function sitemap(): MetadataRoute.Sitemap {
  const entries = [...locales.flatMap((locale) => ['', '/about'].map((part) => ({ locale, url: localePath(locale, part || '/'), id: undefined as string | undefined }))), ...getCatalog().documents.map((doc) => ({ locale: doc.locale, url: doc.url, id: identity(doc) }))];
  return entries.map((entry) => ({ url: new URL(entry.url, site.origin).href, alternates: { languages: Object.fromEntries(Object.entries(alternates(entry.url, entry.id).languages).map(([key, url]) => [key, new URL(url, site.origin).href])) } }));
}
