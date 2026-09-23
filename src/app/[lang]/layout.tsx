/**
 * [INPUT]: Validated route locale, current dictionary, and shared site shell.
 * [OUTPUT]: Static locale-specific HTML, self-hosted Latin fonts, site footer, and narrowly scoped client providers.
 * [POS]: Public language root; language-prefixed pages never consult cookies.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Newsreader, IBM_Plex_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { locales, isLocale, htmlLanguages } from '@/lib/i18n/config';
import { fumadocsMessages } from '@/lib/i18n/fumadocs';
import { Providers } from '@/components/layout/providers';
import { SiteHeader } from '@/components/layout/site-header';
import { site } from '@/lib/site-config';
import '@/styles/globals.css';
// Latin display and mono faces only; CJK headings fall back to system serif to avoid multi-megabyte downloads.
const serif = Newsreader({ subsets: ['latin'], axes: ['opsz'], variable: '--font-newsreader', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' });
export const metadata: Metadata = { title: { template: `%s · ${site.name}`, default: site.name }, icons: { icon: '/favicon.svg' } };
export function generateStaticParams() { return locales.map((lang) => ({ lang })); }
export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  const messages = await getMessages({ locale: lang });
  const ui = await getTranslations({ locale: lang, namespace: 'Ui' });
  const clientMessages = Object.fromEntries(['Ui', 'Language', 'Learning', 'Search'].map((namespace) => [namespace, messages[namespace]]));
  return <html lang={htmlLanguages[lang]} className={`light ${serif.variable} ${mono.variable}`}><body>
    <Providers locale={lang} messages={clientMessages} translations={fumadocsMessages(messages.Ui as Record<string, string>)}>
      <a href="#main-content" className="skip-link">{ui('skip')}</a>
      {site.preview && <div className="preview-banner">{ui('preview')}</div>}
      <SiteHeader locale={lang} />
      <noscript><style>{'.search-trigger, .copy-button, .mobile-course-bar > button, [data-toc-popover], .prose button { display: none !important; }'}</style><p className="nojs-notice">{ui('noJs')}</p></noscript>
      {children}
      <footer className="site-footer"><div className="footer-inner"><span className="brand-small">Learning AI Coding</span><p>{ui('footer')}</p><Link href={`/${lang}/about`}>{ui('about')}</Link></div></footer>
    </Providers>
  </body></html>;
}
