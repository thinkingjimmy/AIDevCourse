import { localePath } from '@/lib/i18n/routing';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { getCourses } from '@/lib/content/source';
import { EmptyCourses } from '@/components/course/empty-courses';
import { HomeGallery } from '@/components/home/home-gallery';
import { pageMetadata } from '@/lib/metadata';

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ page?: string | string[] }> };
export async function generateMetadata({ params }: Props) {
  const { lang } = await params; if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: 'Home' });
  return pageMetadata(lang, localePath(lang), t('title').replace('\n', ' '), t('intro'));
}
export default async function HomePage({ params, searchParams }: Props) {
  const { lang } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: 'Home' });
  const course = await getTranslations({ locale: lang, namespace: 'Course' });
  const ui = await getTranslations({ locale: lang, namespace: 'Ui' });
  const courses = getCourses(lang);
  const startingCourse = courses.find(item => item.section === 'introduction' && item.lessons.length)
    ?? courses.find(item => item.id === 'llm-101') ?? courses.find(item => item.lessons.length) ?? courses[0];
  const requestedPage = Number((await searchParams).page);
  const page = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(1, requestedPage), Math.max(1, Math.ceil(courses.length / 9))) : 1;
  return <HomeGallery locale={lang} page={page} startUrl={startingCourse?.url ?? localePath(lang, '/about')}
    courses={courses.map(({ id, slug, title, description, url, level, section, lessons }) => ({
      id, slug, title, description, url, level, section, lessonCount: lessons.length, countLabel: ui('lessonCount', { count: lessons.length }),
    }))}
    labels={{ title: t('title'), intro: t('heroIntro'), start: courses.length ? t('start') : course('aboutSite'),
      opening: t('openingCourse'), updating: course('updating'), previous: t('previousPage'), next: t('nextPage'), pagination: t('pagination'),
      levels: Object.fromEntries((['introduction', 'beginner', 'intermediate', 'advanced'] as const).map(level => [level, level === 'introduction' ? t('gettingStarted') : ui(level)])),
    }}>{!courses.length && <EmptyCourses locale={lang} />}</HomeGallery>;
}
