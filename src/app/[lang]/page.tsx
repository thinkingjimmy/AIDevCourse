import { localePath } from '@/lib/i18n/routing';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { getCourses } from '@/lib/content/source';
import { PageContainer, PageTitle, PageActions, HeroCopy, HeroLead, HeroPrimaryAction } from '@/components/layout/page-primitives';
import { MacExplode } from '@/components/illustrations/mac-explode';
import { EmptyCourses } from '@/components/course/empty-courses';
import { CourseCard } from '@/components/course/course-card';
import { pageMetadata } from '@/lib/metadata';
import { site } from '@/lib/site-config';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: 'Home' });
  return pageMetadata(lang, localePath(lang), t('title').replace('\n', ' '), t('intro'));
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: 'Home' });
  const course = await getTranslations({ locale: lang, namespace: 'Course' });
  const ui = await getTranslations({ locale: lang, namespace: 'Ui' });
  const courses = getCourses(lang);
  const groups = (['introduction', 'beginner', 'intermediate', 'advanced'] as const)
    .map((section) => ({ section, courses: courses.filter((item) => (item.section ?? item.level) === section) }))
    .filter((group) => group.courses.length);
  const startingCourse = courses.find((item) => item.id === 'llm-101') ?? courses.find((item) => item.lessons.length);
  const first = startingCourse?.lessons[0]?.url;
  return <main id="main-content" className="flex flex-[1_0_auto] flex-col" tabIndex={-1}>
    <PageContainer data-slot="home-hero" className="mt-6 py-14 max-[721px]:mt-4 max-[721px]:pt-12 max-[721px]:pb-7">
      <div data-slot="home-hero-frame" aria-hidden="true" className="pointer-events-none absolute inset-0 border border-brand shadow-[3px_3px_0_0] shadow-brand/25 max-[1101px]:inset-x-2">
        <div className="relative flex h-7 items-center justify-center border-b border-brand">
          <div className="absolute inset-[3px] bg-[repeating-linear-gradient(to_bottom,var(--color-brand)_0_1px,transparent_1px_4px)] opacity-35" />
          <span className="relative bg-background px-4 font-mono text-xs leading-5 tracking-label text-brand">{site.name}</span>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] gap-x-12 gap-y-6 max-[1101px]:gap-x-8 max-[721px]:grid-cols-[minmax(0,1fr)_clamp(80px,24vw,104px)] max-[721px]:gap-x-3 max-[721px]:gap-y-5">
        <HeroCopy className="col-start-1 row-start-1 self-end max-[721px]:contents">
          <PageTitle variant="hero" className="text-brand text-balance font-pixel font-normal max-[841px]:text-[clamp(2rem,5vw,2.5rem)] max-[721px]:col-start-1 max-[721px]:row-start-1 max-[721px]:mb-0 max-[721px]:self-center max-[721px]:text-[clamp(1.625rem,7.5vw,2rem)] max-[721px]:leading-[1.12] max-[721px]:[overflow-wrap:anywhere]">{t('title')}</PageTitle>
          <HeroLead className="mb-0 text-pretty max-[721px]:col-span-2 max-[721px]:row-start-2 max-[721px]:text-ui max-[721px]:leading-copy max-[721px]:text-reading">{t('intro')}</HeroLead>
        </HeroCopy>
        <PageActions className="col-start-1 row-start-2 min-w-0 self-start max-[721px]:col-span-2 max-[721px]:row-start-3 max-[721px]:w-full">
          <HeroPrimaryAction href={courses.length ? first ?? '#catalog' : localePath(lang, '/about')} arrow={courses.length > 0}>
            {courses.length ? first ? t('start') : t('browseCourses') : course('aboutSite')}
          </HeroPrimaryAction>
        </PageActions>
        <div data-slot="home-hero-art" className="relative col-start-2 row-span-2 row-start-1 aspect-[450.06/515.9] w-[min(100%,280px)] min-w-0 self-center justify-self-center overflow-hidden bg-transparent select-none max-[1101px]:w-[min(100%,240px)] max-[721px]:row-span-1 max-[721px]:w-full"><MacExplode /></div>
      </div>
    </PageContainer>
    <PageContainer className="flex-[1_0_auto] space-y-12 pt-12 pb-[72px] max-[721px]:space-y-9 max-[721px]:pt-8 max-[721px]:pb-12" id="catalog">
      {groups.length ? groups.map((group) => <section key={group.section} aria-labelledby={`courses-${group.section}`}>
        <h2 id={`courses-${group.section}`} className="m-0 mb-7 font-sans text-2xl font-semibold tracking-tight max-[721px]:mb-4">{ui(group.section)}</h2>
        <div data-slot="course-grid" className="grid grid-cols-2 gap-5 max-[721px]:-mx-4 max-[721px]:grid-cols-1 max-[721px]:gap-3">
          {group.courses.map((item) => <CourseCard key={item.id} course={item} />)}
        </div>
      </section>) : <EmptyCourses locale={lang} />}
    </PageContainer>
  </main>;
}
