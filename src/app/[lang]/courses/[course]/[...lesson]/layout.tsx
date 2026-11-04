import type { ReactNode } from 'react';
import { LearnShell } from '@/components/course/course-layout';
import { isLocale } from '@/lib/i18n/config';
export default async function LessonLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) return children;
  return <LearnShell locale={lang}>{children}</LearnShell>;
}
