/**
 * [INPUT]: Current locale and filtered course manifests.
 * [OUTPUT]: Public localized course library or an honest empty state.
 * [POS]: Course discovery route, with no fallback to another language's body.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { getCourses } from '@/lib/content/source';
import { CourseCard } from '@/components/course/course-card';
import { EmptyCourses } from '@/components/course/empty-courses';
import { GridFrame } from '@/components/layout/grid-frame';
import { pageMetadata } from '@/lib/seo/metadata';
import { site } from '@/lib/site-config';
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: 'Course' });
  return pageMetadata(lang, `/${lang}/courses`, t('title'), t('intro'));
}
export default async function CoursesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: 'Course' });
  const courses = getCourses(lang);
  return <main id="main-content" className="site-main" tabIndex={-1}>
    <GridFrame><header className="page-heading"><p className="eyebrow"><span className="square-dot" aria-hidden />{site.name}</p><h1 className="serif">{t('title')}</h1><p>{t('intro')}</p></header></GridFrame>
    <GridFrame>{courses.length ? courses.map((course, index) => <CourseCard key={course.id} course={course} index={index} />) : <EmptyCourses locale={lang} />}</GridFrame>
  </main>;
}
