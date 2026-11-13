import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { isLocale } from '@/lib/i18n/config';
import { blogSlug } from '@/lib/i18n/routing';
import { getCourse } from '@/lib/content/source';
import { LearningProvider } from '@/components/progress/progress-provider';
export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string; course: string }> }) {
  const { lang, course: slug } = await params; if (!isLocale(lang) || slug === blogSlug) notFound(); setRequestLocale(lang);
  const course = getCourse(lang, slug); if (!course) notFound();
  return <LearningProvider key={course.id} course={course}>{children}</LearningProvider>;
}
