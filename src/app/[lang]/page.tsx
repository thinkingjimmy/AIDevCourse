import { localePath } from '@/lib/i18n/routing';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { getCourses } from '@/lib/content/source';
import { EmptyCourses } from '@/components/course/empty-courses';
import { HomeGallery } from '@/components/home/home-gallery';
import { pageMetadata } from '@/lib/metadata';
import type { GalleryItem } from '@/components/home/disk';
import { getLearningResources } from '@/components/home/resources';

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
  const resources = await getLearningResources(lang);
  const courses = getCourses(lang);
  const startingCourse = courses.find(item => item.section === 'introduction' && item.lessons.length)
    ?? courses.find(item => item.id === 'llm-101') ?? courses.find(item => item.lessons.length) ?? courses[0];
  const requestedPage = Number((await searchParams).page);
  const courseItems: GalleryItem[] = courses.map(({ id, slug, title, description, url, level, section, lessons }) => ({
    id, slug, title, description, url, kind: 'course', group: section === 'introduction' ? 'resources' : level,
    dots: section === 'introduction' ? 0 : { beginner: 1, intermediate: 2, advanced: 3 }[level],
    labels: { level: section === 'introduction' ? t('gettingStarted') : ui(level), status: lessons.length ? ui('lessonCount', { count: lessons.length }) : course('updating') },
  }));
  const items = [...courseItems.filter(item => item.group === 'resources'), ...resources.items, ...courseItems.filter(item => item.group !== 'resources')];
  const page = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(1, requestedPage), Math.max(1, Math.ceil(items.length / 9))) : 1;
  return <HomeGallery locale={lang} page={page} startUrl={startingCourse?.url ?? localePath(lang, '/about')}
    items={items}
    labels={{ title: t('title'), intro: t('heroIntro'), start: courses.length ? t('start') : course('aboutSite'),
      opening: t('openingCourse'), previous: t('previousPage'), next: t('nextPage'), pagination: t('pagination'),
      levels: { resources: resources.label, ...Object.fromEntries((['beginner', 'intermediate', 'advanced'] as const).map(level => [level, ui(level)])) },
    }}>{!courses.length && <EmptyCourses locale={lang} />}</HomeGallery>;
}
