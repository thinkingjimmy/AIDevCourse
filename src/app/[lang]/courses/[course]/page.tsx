import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { blogSlug } from '@/lib/i18n/routing';
import { getCatalog, getCourse } from '@/lib/content/source';
import { CourseOverview } from '@/components/course/overview/course-overview';
import { pageMetadata } from '@/lib/metadata';

type Props = { params: Promise<{ lang: string; course: string }> };
export function generateStaticParams() {
  return getCatalog().courses.filter(course => course.slug !== blogSlug)
    .map(course => ({ lang: course.locale, course: course.slug }));
}
export async function generateMetadata({ params }: Props) {
  const { lang, course: slug } = await params; if (!isLocale(lang)) return {};
  const course = getCourse(lang, slug); return course ? pageMetadata(lang, course.url, course.title, course.description, course.id) : {};
}
export default async function CoursePage({ params }: Props) {
  const { lang, course: slug } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const course = getCourse(lang, slug); if (!course) notFound();
  return <CourseOverview course={course} />;
}
