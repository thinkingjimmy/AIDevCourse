import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { locales, isLocale, htmlLanguages } from '@/lib/i18n/config';
import { fumadocsMessages } from '@/lib/i18n/fumadocs';
import { Providers } from '@/components/layout/providers';
import { SiteFrame } from '@/components/layout/site-frame';
import { MissingPage } from '@/components/layout/missing-page';
import { SiteFooter } from '@/components/layout/page-primitives';
import { HomeHeader } from '@/components/layout/home-header';
import { getAchievementCourses, getCourses } from '@/lib/content/source';
import { AchievementProvider } from '@/components/progress/achievement-provider';
import '@/styles/globals.css';
export function generateStaticParams() { return locales.map((lang) => ({ lang })); }
export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  const messages = await getMessages({ locale: lang });
  const ui = await getTranslations({ locale: lang, namespace: 'Ui' });
  const home = await getTranslations({ locale: lang, namespace: 'Home' });
  const clientMessages = Object.fromEntries(['Ui', 'Language', 'Search', 'Course', 'Achievement', 'Author'].map((namespace) => [namespace, messages[namespace]]));
  const lessonPaths = getCourses(lang).flatMap((course) => course.lessons.map((lesson) => lesson.url));
  // Translation extensions can add root attributes before React hydrates.
  return <html lang={htmlLanguages[lang]} className="light" suppressHydrationWarning><body>
    <Providers locale={lang} messages={clientMessages} translations={fumadocsMessages(messages.Ui as Record<string, string>)}>
      <AchievementProvider courses={getAchievementCourses(lang)}>
        <a href="#main-content" className="fixed -top-[100px] left-4 z-[100] bg-foreground px-[18px] py-3 text-white focus:top-3">{ui('skip')}</a>
        <SiteFrame lessonPaths={lessonPaths} header={<HomeHeader locale={lang} />} footer={<SiteFooter meta={home('footerMeta')}>{home('footerLead')}</SiteFooter>} errorPage={<MissingPage locale={lang} />}>
          <noscript><p className="nojs-notice relative z-[2] border-b border-border bg-surface px-6 py-2 text-center text-sm">{ui('noJs')}</p></noscript>
          {children}
        </SiteFrame>
      </AchievementProvider>
    </Providers>
  </body></html>;
}
