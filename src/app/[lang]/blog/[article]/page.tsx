import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { blogSlug } from '@/lib/i18n/routing';
import { getCatalog } from '@/lib/content/source';
import { LearnShell } from '@/components/course/course-layout';
import { LessonPage, lessonMetadata } from '@/components/course/reader/lesson-page';
import type { ReadingSearch } from '@/components/course/reader/model';

type Props = { params: Promise<{ lang: string; article: string }>; searchParams: Promise<ReadingSearch> };

export function generateStaticParams() {
  return getCatalog().documents.filter(doc => doc.data.kind === 'lesson' && doc.courseSlug === blogSlug)
    .map(doc => ({ lang: doc.locale, article: doc.slug.at(-1)! }));
}

export async function generateMetadata({ params }: Props) {
  const { lang, article } = await params;
  return isLocale(lang) ? lessonMetadata(lang, blogSlug, [article]) : {};
}

export default async function BlogArticlePage({ params, searchParams }: Props) {
  const { lang, article } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  return <LearnShell locale={lang}>
    <LessonPage locale={lang} course={blogSlug} lesson={[article]} searchParams={searchParams} />
  </LearnShell>;
}
