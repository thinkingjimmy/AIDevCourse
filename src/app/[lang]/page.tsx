/**
 * [INPUT]: Active locale, published course manifests, shared CourseCard, and the Phosphor action arrow, canonical locale paths.
 * [OUTPUT]: Homepage with a rail-aligned Geist Pixel hero title, menu-styled learning action, exploded Mac, and a foundations catalog without a subtitle.
 * [POS]: Public entry surface; the learning action prioritizes AI 101's first published lesson.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { localePath } from '@/lib/i18n/routing';
import Link from 'next/link';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { getCourses } from '@/lib/content/source';
import { Button } from '@/components/ui/button';
import { PageContainer, PageTitle, PageActions, HeroGrid, HeroCopy, HeroLead } from '@/components/layout/page-primitives';
import { MacExplode } from '@/components/illustrations/mac-explode';
import { EmptyCourses } from '@/components/course/empty-courses';
import { CourseCard } from '@/components/course/course-card';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: 'Home' });
  return pageMetadata(lang, localePath(lang), t('title').replace('\n', ' '), t('intro'));
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: 'Home' });
  const course = await getTranslations({ locale: lang, namespace: 'Course' });
  const courses = getCourses(lang);
  const startingCourse = courses.find((item) => item.id === 'ai-101') ?? courses.find((item) => item.lessons.length);
  const first = startingCourse?.lessons[0]?.url;
  return <main id="main-content" className="flex flex-[1_0_auto] flex-col" tabIndex={-1}>
    <PageContainer className="overflow-x-clip pt-[70px] pb-[72px] max-[721px]:pt-9 max-[721px]:pb-7">
      <HeroGrid>
        <HeroCopy>
          <PageTitle variant="hero" className="font-pixel font-normal">{t('title')}</PageTitle>
          <HeroLead>{t('intro')}</HeroLead>
          <PageActions>
            <Button asChild variant="action-raised" size="action">
              <Link href={courses.length ? first ?? '#catalog' : localePath(lang, '/about')}>
                {courses.length ? first ? t('start') : t('browseCourses') : course('aboutSite')}
                {courses.length > 0 && <ArrowRightIcon size={16} aria-hidden />}
              </Link>
            </Button>
          </PageActions>
        </HeroCopy>
        <div className="relative -left-5 aspect-[450.06/515.9] w-[min(320px,100%)] min-w-0 justify-self-start overflow-hidden bg-transparent max-[1101px]:w-[min(220px,100%)] max-[841px]:w-[min(228px,100%)] max-[841px]:max-w-[228px] max-[841px]:justify-self-center"><MacExplode /></div>
      </HeroGrid>
    </PageContainer>
    <hr className="m-0 h-0 border-0 border-t border-border" />
    <PageContainer className="flex-[1_0_auto] pt-12 pb-[72px]" id="catalog">
      <h2 className="m-0 mb-7 font-sans text-2xl font-semibold tracking-tight">{t('courseTitle')}</h2>
      {courses.length ? <div data-slot="course-grid" className="grid grid-cols-2 gap-5 max-[721px]:grid-cols-1">
        {courses.map((item) => <CourseCard key={item.id} course={item} />)}
      </div> : <EmptyCourses locale={lang} />}
    </PageContainer>
  </main>;
}
