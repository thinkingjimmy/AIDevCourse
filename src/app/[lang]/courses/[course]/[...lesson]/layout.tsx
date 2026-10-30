import type { ReactNode } from 'react';
import { LearnShell } from '@/components/course/course-layout';
import { lessonIndex } from '@/components/search/lessons';
import { getCatalog } from '@/lib/content/source';
import { isLocale, type Locale } from '@/lib/i18n/config';
export default async function LessonLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) return children;
  const catalog = getCatalog();
  return <LearnShell locale={lang as Locale} version={catalog.version} translations={catalog.translations} lessons={lessonIndex(catalog, lang)}>{children}</LearnShell>;
}
