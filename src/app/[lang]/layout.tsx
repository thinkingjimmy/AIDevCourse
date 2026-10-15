/**
 * [INPUT]: Validated route locale, current dictionary, and the zinc site frame.
 * [OUTPUT]: Static locale-specific HTML, self-hosted Latin fonts, sticky header, and narrowly scoped client providers.
 * [POS]: Public language root; language-prefixed pages never consult cookies.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Newsreader, IBM_Plex_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { locales, isLocale, htmlLanguages } from '@/lib/i18n/config';
import { fumadocsMessages } from '@/lib/i18n/fumadocs';
import { Providers } from '@/components/layout/providers';
import { SiteFrame } from '@/components/layout/site-frame';
import { HomeHeader } from '@/components/layout/home-header';
import { site } from '@/lib/site-config';
import '@/styles/globals.css';
// Latin display and mono faces only; CJK headings fall back to the system sans to avoid multi-megabyte downloads.
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
  const home = await getTranslations({ locale: lang, namespace: 'Home' });
  const clientMessages = Object.fromEntries(['Ui', 'Language', 'Learning', 'Search', 'Course'].map((namespace) => [namespace, messages[namespace]]));
  return <html lang={htmlLanguages[lang]} className={`light ${serif.variable} ${mono.variable}`}><body>
    <Providers locale={lang} messages={clientMessages} translations={fumadocsMessages(messages.Ui as Record<string, string>)}>
      <a href="#main-content" className="skip-link">{ui('skip')}</a>
      <SiteFrame locale={lang} header={<HomeHeader locale={lang} />} footer={<footer className="home-foot"><div className="home-inner"><span>{home('footerLead')}</span><span className="mono">{home('footerMeta')}</span></div></footer>}>
        <noscript><style>{'.search-trigger, .copy-button, .mobile-course-bar > button, [data-toc-popover], .prose button { display: none !important; }'}</style><p className="nojs-notice">{ui('noJs')}</p></noscript>
        {children}
      </SiteFrame>
    </Providers>
  </body></html>;
}
