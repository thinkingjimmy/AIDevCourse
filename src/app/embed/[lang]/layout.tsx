import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { htmlLanguages, isLocale, locales } from '@/lib/i18n/config';
import { fumadocsMessages } from '@/lib/i18n/fumadocs';
import { Providers } from '@/components/layout/providers';
import { AchievementProvider } from '@/components/progress/achievement-provider';
import { getAchievementCourses } from '@/lib/content/source';
import '@/styles/globals.css';

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function EmbedLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  const messages = await getMessages({ locale: lang });
  const clientMessages = Object.fromEntries(
    ['Ui', 'Language', 'Search', 'Course', 'Achievement', 'Author', 'Generation', 'MenuComparison', 'Training', 'Pretraining', 'ChatSequence', 'Newton']
      .map((namespace) => [namespace, messages[namespace]]),
  );
  return (
    <html lang={htmlLanguages[lang]} className="light" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        {/* The review host needs this signal even when the app bundles cannot load. */}
        <script src="/embed/preview-ready.js" async fetchPriority="high" />
        <Providers locale={lang} messages={clientMessages} translations={fumadocsMessages(messages.Ui as Record<string, string>)}>
          <AchievementProvider courses={getAchievementCourses(lang)}>{children}</AchievementProvider>
        </Providers>
      </body>
    </html>
  );
}
