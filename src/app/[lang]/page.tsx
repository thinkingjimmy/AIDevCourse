import { localePath } from '@/lib/i18n/routing';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { getCourses } from '@/lib/content/source';
import { EmptyCourses } from '@/components/course/empty-courses';
import { HomeGallery } from '@/components/home/home-gallery';
import { pageMetadata } from '@/lib/metadata';
import { getGalleryCatalog } from '@/components/home/resources';
import { blogCourseId } from '@/lib/site-config';

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ page?: string | string[]; view?: string | string[] }> };
export async function generateMetadata({ params }: Props) {
  const { lang } = await params; if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: 'Home' });
  return pageMetadata(lang, localePath(lang), t('title').replace('\n', ' '), t('intro'));
}
export default async function HomePage({ params, searchParams }: Props) {
  const { lang } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const [t, course, ui, { items }] = await Promise.all([
    getTranslations({ locale: lang, namespace: 'Home' }),
    getTranslations({ locale: lang, namespace: 'Course' }),
    getTranslations({ locale: lang, namespace: 'Ui' }),
    getGalleryCatalog(lang),
  ]);
  const publishedCourses = getCourses(lang);
  const courses = publishedCourses.filter(item => item.id !== blogCourseId);
  const blogCourse = publishedCourses.find(item => item.id === blogCourseId);
  const blog = blogCourse && {
    title: blogCourse.title, url: blogCourse.url,
    // Blog metadata lists articles in publication order.
    articles: blogCourse.lessons.slice(-6).reverse().map(({ id, title, description, url }) => ({ id, title, description, url })),
  };
  const startingCourse = courses.find(item => item.section === 'introduction' && item.lessons.length)
    ?? courses.find(item => item.id === 'llm-101') ?? courses.find(item => item.lessons.length) ?? courses[0];
  const { page, view } = await searchParams;
  const views = { courses: t('coursesView'), resources: t('resourcesView') };
  const directions = (view: string) => ({ previous: t('previousView', { view }), next: t('nextView', { view }) });
  return <HomeGallery locale={lang} initialView={view === 'resources' ? 'resources' : 'courses'} initialPage={Number(page)}
    startUrl={startingCourse?.url ?? localePath(lang, '/about')} items={items} blog={blog}
    labels={{ title: t('title'), start: courses.length ? t('start') : course('aboutSite'),
      opening: { courses: t('openingCourse'), resources: t('openingResource') },
      previous: t('previousPage'), next: t('nextPage'), pagination: t('pagination'), views,
      macGroups: { beginner: ui('beginner'), intermediate: ui('intermediate'), dictionaries: t('dictionaries') },
      blogOverview: t('blogOverview'), emptyResources: t('emptyResources'),
      switchView: t('switchView'), switchTo: { courses: directions(views.courses), resources: directions(views.resources) },
    }}>{!courses.length && <EmptyCourses locale={lang} />}</HomeGallery>;
}
