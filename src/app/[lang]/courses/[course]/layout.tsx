/**
 * [INPUT]: Language/course parameters, the zinc header, and the shared progress context.
 * [OUTPUT]: Course and lesson shell sharing the homepage frame, whose side rules run through the header.
 * [POS]: Runtime publication boundary for the course overview and all lesson routes.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { isLocale } from '@/lib/i18n/config';
import { getCourse } from '@/lib/content/source';
import { HomeHeader } from '@/components/layout/home-header';
import { LearnShell } from '@/components/course/course-layout';
import { ProgressProvider } from '@/components/progress/progress-provider';
export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string; course: string }> }) {
  const { lang, course: slug } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const course = getCourse(lang, slug); if (!course) notFound();
  return <ProgressProvider course={course}><div className="learn-page home-shell">
    <HomeHeader locale={lang} />
    <div className="learn-frame"><LearnShell>{children}</LearnShell></div>
  </div></ProgressProvider>;
}
