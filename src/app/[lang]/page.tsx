/**
 * [INPUT]: Active locale, published course manifests, shared CourseCard, and the Phosphor action arrow.
 * [OUTPUT]: Homepage body with a zinc hero, exploded Mac, and a two-column grid of horizontal course cards.
 * [POS]: Public entry surface; counts and destinations derive from the catalog.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { getCourses } from '@/lib/content/source';
import { Button } from '@/components/ui/button';
import { PageContainer, PageTitle, PageActions, HeroGrid, HeroCopy, HeroLead } from '@/components/layout/page-primitives';
import { MacExplode } from '@/components/home/mac-explode';
import { EmptyCourses } from '@/components/course/empty-courses';
import { CourseCard } from '@/components/course/course-card';
import { pageMetadata } from '@/lib/seo/metadata';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: 'Home' });
  return pageMetadata(lang, `/${lang}`, t('title').replace('\n', ' '), t('intro'));
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: 'Home' });
  const course = await getTranslations({ locale: lang, namespace: 'Course' });
  const courses = getCourses(lang);
  const first = courses.find((item) => item.lessons.length)?.lessons[0]?.url;
  return <main id="main-content" className="flex flex-[1_0_auto] flex-col" tabIndex={-1}>
    <PageContainer className="overflow-x-clip pt-[70px] pb-[72px] max-[721px]:pt-9 max-[721px]:pb-7">
      <HeroGrid>
        <HeroCopy>
          <p className="m-0 mb-[22px] inline-flex items-center gap-2 font-sans text-[14px] font-normal tracking-normal text-muted-foreground normal-case"><span className="size-1.5 rounded-full bg-[#22c55e]" aria-hidden />{t('eyebrow')}</p>
          <PageTitle variant="hero">{t('title')}</PageTitle>
          <HeroLead>{t('intro')}</HeroLead>
          <PageActions>
            {courses.length
              ? <Button asChild variant="action" size="action"><Link href={first ?? '#catalog'}>{first ? t('start') : t('browseCourses')}<ArrowRightIcon size={16} aria-hidden /></Link></Button>
              : <Button asChild variant="action" size="action"><Link href={`/${lang}/about`}>{course('aboutSite')}</Link></Button>}
          </PageActions>
        </HeroCopy>
        <div className="relative -left-5 aspect-[450.06/515.9] w-[min(320px,100%)] min-w-0 justify-self-start overflow-hidden bg-transparent max-[1101px]:w-[min(220px,100%)] max-[841px]:w-[min(228px,100%)] max-[841px]:max-w-[228px] max-[841px]:justify-self-center"><MacExplode /></div>
      </HeroGrid>
    </PageContainer>
    <hr className="m-0 h-0 border-0 border-t border-border" />
    <PageContainer className="flex-[1_0_auto] pt-12 pb-[72px]" id="catalog">
      <div className="mb-7"><h2 className="m-0 font-sans text-[22px] font-semibold tracking-[-.02em]">{t('courseTitle')}</h2><p className="m-0 mt-1 text-[14px] text-muted-foreground">{t('courseIntro')}</p></div>
      {courses.length ? <div data-slot="course-grid" className="grid grid-cols-2 gap-5 max-[721px]:grid-cols-1">
        {courses.map((item) => <CourseCard key={item.id} course={item} />)}
      </div> : <EmptyCourses locale={lang} />}
    </PageContainer>
  </main>;
}
