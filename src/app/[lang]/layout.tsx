/**
 * [INPUT]: Validated route locale, current dictionary including shared achievement interface messages, root brand metadata, published lesson URLs, and the zinc site frame.
 * [OUTPUT]: Static locale-specific HTML, Geist fonts with CSS-managed Pixel fallbacks and locale-selected Noto CJK fonts, sticky header, and narrowly scoped client providers.
 * [POS]: Public language root; language-prefixed pages never consult cookies.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ReactNode } from 'react';
import { Geist, Geist_Mono, Geist_Pixel, Noto_Sans_SC, Noto_Sans_JP } from 'next/font/google';
import { notFound } from 'next/navigation';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { locales, isLocale, htmlLanguages } from '@/lib/i18n/config';
import { fumadocsMessages } from '@/lib/i18n/fumadocs';
import { Providers } from '@/components/layout/providers';
import { SiteFrame } from '@/components/layout/site-frame';
import { SiteFooter } from '@/components/layout/page-primitives';
import { HomeHeader } from '@/components/layout/home-header';
import { getCourses } from '@/lib/content/source';
import '@/styles/globals.css';
const sans = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
// Turbopack needs an explicit list; the shared CSS stack supplies Geist and Noto fallbacks.
const pixel = Geist_Pixel({
  subsets: ['latin'],
  variable: '--font-geist-pixel',
  display: 'swap',
  adjustFontFallback: false,
  fallback: [],
});
// Load CJK slices only when the selected language renders matching glyphs.
const chinese = Noto_Sans_SC({ variable: '--font-noto-sans-sc', display: 'swap', preload: false, adjustFontFallback: false });
const japanese = Noto_Sans_JP({ variable: '--font-noto-sans-jp', display: 'swap', preload: false, adjustFontFallback: false });
export function generateStaticParams() { return locales.map((lang) => ({ lang })); }
export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const cjkFont = lang === 'zh' ? chinese.variable : lang === 'ja' ? japanese.variable : '';
  setRequestLocale(lang);
  const messages = await getMessages({ locale: lang });
  const ui = await getTranslations({ locale: lang, namespace: 'Ui' });
  const home = await getTranslations({ locale: lang, namespace: 'Home' });
  const clientMessages = Object.fromEntries(['Ui', 'Language', 'Search', 'Course', 'Achievement'].map((namespace) => [namespace, messages[namespace]]));
  const lessonPaths = getCourses(lang).flatMap((course) => course.lessons.map((lesson) => lesson.url));
  return <html lang={htmlLanguages[lang]} className={`light ${sans.variable} ${mono.variable} ${pixel.variable} ${cjkFont}`}><body>
    <Providers locale={lang} messages={clientMessages} translations={fumadocsMessages(messages.Ui as Record<string, string>)}>
      <a href="#main-content" className="fixed -top-[100px] left-4 z-[100] bg-foreground px-[18px] py-3 text-white focus:top-3">{ui('skip')}</a>
      <SiteFrame lessonPaths={lessonPaths} header={<HomeHeader locale={lang} />} footer={<SiteFooter meta={home('footerMeta')}>{home('footerLead')}</SiteFooter>}>
        <noscript><p className="nojs-notice relative z-[2] border-b border-border bg-surface px-6 py-2 text-center text-sm">{ui('noJs')}</p></noscript>
        {children}
      </SiteFrame>
    </Providers>
  </body></html>;
}
