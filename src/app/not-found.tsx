/**
 * [INPUT]: Shared language whitelist for paths outside any valid locale.
 * [OUTPUT]: A real global 404 with accessible language entry links.
 * [POS]: Root error document for invalid locales and unknown unprefixed paths.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { locales, languageNames, htmlLanguages } from '@/lib/i18n/config';
import { site } from '@/lib/site-config';
import '@/styles/globals.css';
export default function GlobalNotFound() {
  return <html lang="en"><body><main className="not-found"><p className="eyebrow">404 · {site.name}</p><h1>Page not found</h1><nav className="alternate-links" aria-label="Choose language">{locales.map((locale) => <a key={locale} href={`/${locale}/courses`} lang={htmlLanguages[locale]}>{languageNames[locale]}</a>)}</nav></main></body></html>;
}
