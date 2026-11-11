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

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ page?: string | string[]; view?: string | string[] }> };
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
  const { items: dictionaries } = await getLearningResources(lang);
  const catalog = getCourses(lang);
  const courses = catalog.filter(item => item.id !== 'musings');
  const blog = catalog.find(item => item.id === 'musings');
  const startingCourse = courses.find(item => item.section === 'introduction' && item.lessons.length)
    ?? courses.find(item => item.id === 'llm-101') ?? courses.find(item => item.lessons.length) ?? courses[0];
  const { page, view } = await searchParams;
  const courseItems: GalleryItem[] = courses.map(({ id, slug, title, description, url, level, section, lessons }) => ({
    id, slug, title, description, url, kind: 'course', group: section === 'introduction' ? 'introduction' : level,
    dots: section === 'introduction' ? 0 : { beginner: 1, intermediate: 2, advanced: 3 }[level],
    labels: { level: section === 'introduction' ? t('gettingStarted') : ui(level), status: lessons.length ? ui('lessonCount', { count: lessons.length }) : course('updating') },
  }));
  const resourceItems = [...dictionaries];
  if (blog) resourceItems.unshift({
    id: blog.id, slug: blog.slug, title: blog.title, description: blog.description, url: blog.url,
    kind: 'resource', group: 'resources', dots: 0, labels: { level: '', status: t('articleCount', { count: blog.lessons.length }) },
  });
  const views = { courses: t('coursesView'), resources: t('resourcesView') };
  const directions = (view: string) => ({ previous: t('previousView', { view }), next: t('nextView', { view }) });
  return <HomeGallery locale={lang} initialView={view === 'resources' ? 'resources' : 'courses'} initialPage={Number(page)}
    startUrl={startingCourse?.url ?? localePath(lang, '/about')} items={{ courses: courseItems, resources: resourceItems }}
    labels={{ title: t('title'), intro: t('heroIntro'), start: courses.length ? t('start') : course('aboutSite'),
      opening: { courses: t('openingCourse'), resources: t('openingResource') },
      previous: t('previousPage'), next: t('nextPage'), pagination: t('pagination'), views,
      switchView: t('switchView'), switchTo: { courses: directions(views.courses), resources: directions(views.resources) },
    }}>{!courses.length && <EmptyCourses locale={lang} />}</HomeGallery>;
}
