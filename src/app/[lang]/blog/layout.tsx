import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { blogSlug } from '@/lib/i18n/routing';
import { getCourse } from '@/lib/content/source';
import { LearningProvider } from '@/components/progress/progress-provider';

export default async function BlogLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  const blog = getCourse(lang, blogSlug);
  if (!blog) notFound();
  return <LearningProvider key={blog.id} course={blog}>{children}</LearningProvider>;
}
