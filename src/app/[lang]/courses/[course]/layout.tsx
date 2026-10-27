/**
 * [INPUT]: Language/course parameters and the shared learning context.
 * [OUTPUT]: Centered content frame and learning context for the course overview. Lesson routes opt out of the site header.
 * [POS]: Runtime publication boundary for the course overview and all lesson routes.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { isLocale } from '@/lib/i18n/config';
import { getCourse } from '@/lib/content/source';
import { LearningProvider } from '@/components/progress/progress-provider';
export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string; course: string }> }) {
  const { lang, course: slug } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const course = getCourse(lang, slug); if (!course) notFound();
  return <LearningProvider key={course.id} course={course}>{children}</LearningProvider>;
}
