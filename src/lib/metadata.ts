/**
 * [INPUT]: Public translation map, locale, and configured site origin.
 * [OUTPUT]: Self-canonical metadata and reciprocal public-only alternates.
 * [POS]: Shared SEO derivation for pages and sitemap, using only catalogued lessons.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { Metadata } from 'next';
import { locales, htmlLanguages, type Locale } from './i18n/config';
import { getCatalog } from './content/source';
import { site } from './site-config';
export function alternates(locale: Locale, path: string, identity?: string) {
  const catalog = getCatalog();
  const versions = identity ? catalog.translations[identity] ?? [] : locales.map((lang) => ({ locale: lang, url: `/${lang}${path.replace(/^\/[^/]+/, '')}` }));
  const languages: Record<string, string> = Object.fromEntries(versions.map((version) => [htmlLanguages[version.locale], version.url]));
  if (identity) {
    const document = catalog.documents.find((doc) => doc.url === path);
    if (document && catalog.documents.some((doc) => doc.url === document.sourceUrl)) languages['x-default'] = document.sourceUrl;
  } else if (path === `/${locale}`) languages['x-default'] = '/';
  return { canonical: path, languages };
}
export function pageMetadata(locale: Locale, path: string, title: string, description: string, identity?: string): Metadata {
  return { title, description, metadataBase: new URL(site.origin), alternates: alternates(locale, path, identity),
    openGraph: { title, description, locale: htmlLanguages[locale], url: path, siteName: site.name, type: 'website' },
    twitter: { card: 'summary', title, description }, robots: site.indexable ? { index: true, follow: true } : { index: false, follow: false } };
}
