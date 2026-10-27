/**
 * [INPUT]: Public translation map, locale, and configured site origin, canonical locale paths.
 * [OUTPUT]: Self-canonical metadata and reciprocal public-only alternates.
 * [POS]: Shared SEO derivation for pages and sitemap, using only catalogued lessons.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { Metadata } from 'next';
import { locales, htmlLanguages, defaultLocale, type Locale } from './i18n/config';
import { localePath, stripLocale } from './i18n/routing';
import { getCatalog } from './content/source';
import { site } from './site-config';
export function alternates(path: string, identity?: string) {
  const catalog = getCatalog();
  const versions = identity ? catalog.translations[identity] ?? [] : locales.map((lang) => ({ locale: lang, url: localePath(lang, stripLocale(path)) }));
  const languages: Record<string, string> = Object.fromEntries(versions.map((version) => [htmlLanguages[version.locale], version.url]));
  if (identity) {
    const document = catalog.documents.find((doc) => doc.url === path);
    if (document && catalog.documents.some((doc) => doc.url === document.sourceUrl)) languages['x-default'] = versions.find((version) => version.locale === defaultLocale)?.url ?? document.sourceUrl;
  } else languages['x-default'] = localePath(defaultLocale, stripLocale(path));
  return { canonical: path, languages };
}
export function pageMetadata(locale: Locale, path: string, title: string, description: string, identity?: string): Metadata {
  return { title, description, metadataBase: new URL(site.origin), alternates: alternates(path, identity),
    openGraph: { title, description, locale: htmlLanguages[locale], url: path, siteName: site.name, type: 'website' },
    twitter: { card: 'summary', title, description }, robots: site.indexable ? { index: true, follow: true } : { index: false, follow: false } };
}
