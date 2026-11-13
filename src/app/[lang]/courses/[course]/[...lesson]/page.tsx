import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { blogSlug } from '@/lib/i18n/routing';
import { getCatalog } from '@/lib/content/source';
import { LessonPage, lessonMetadata } from '@/components/course/reader/lesson-page';
import type { ReadingSearch } from '@/components/course/reader/model';
type Props = { params: Promise<{ lang: string; course: string; lesson: string[] }>; searchParams: Promise<ReadingSearch> };
export function generateStaticParams() {
  return getCatalog().documents.filter(doc => doc.data.kind === 'lesson' && doc.courseSlug !== blogSlug)
    .map(doc => ({ lang: doc.locale, course: doc.courseSlug, lesson: [doc.slug.at(-1)!] }));
}
export async function generateMetadata({ params }: Props) {
  const { lang, course, lesson } = await params; if (!isLocale(lang)) return {};
  return lessonMetadata(lang, course, lesson);
}
export default async function CourseLessonPage({ params, searchParams }: Props) {
  const { lang, course, lesson } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  return <LessonPage locale={lang} course={course} lesson={lesson} searchParams={searchParams} />;
}
