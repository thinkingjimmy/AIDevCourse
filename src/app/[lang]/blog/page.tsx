import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { blogSlug } from '@/lib/i18n/routing';
import { getCatalog, getCourse } from '@/lib/content/source';
import { CourseOverview } from '@/components/course/overview/course-overview';
import { pageMetadata } from '@/lib/metadata';

type Props = { params: Promise<{ lang: string }> };

export function generateStaticParams() {
  return getCatalog().courses.filter(course => course.slug === blogSlug).map(course => ({ lang: course.locale }));
}

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const blog = getCourse(lang, blogSlug);
  return blog ? pageMetadata(lang, blog.url, blog.title, blog.description, blog.id) : {};
}

export default async function BlogPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  const blog = getCourse(lang, blogSlug);
  if (!blog) notFound();
  return <CourseOverview course={blog} />;
}
