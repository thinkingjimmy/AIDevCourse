import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { groupModules } from '@/lib/content/model';
import { getCatalog, getCourse, getArticle } from '@/lib/content/source';
import { PageTitle, PageActions, HeroGrid, HeroCopy, HeroLead, HeroPrimaryAction } from '@/components/layout/page-primitives';
import { MacExplode } from '@/components/illustrations/mac-explode';
import { ChipExplode } from '@/components/illustrations/chip-explode';
import { RocketExplode } from '@/components/illustrations/rocket-explode';
import { ServoExplode } from '@/components/illustrations/servo/servo-explode';
import { pageMetadata } from '@/lib/metadata';
type Props = { params: Promise<{ lang: string; course: string }> };
export function generateStaticParams() { return getCatalog().courses.map((course) => ({ lang: course.locale, course: course.slug })); }
export async function generateMetadata({ params }: Props) {
  const { lang, course: slug } = await params; if (!isLocale(lang)) return {};
  const course = getCourse(lang, slug); return course ? pageMetadata(lang, course.url, course.title, course.description, course.id) : {};
}
export default async function CoursePage({ params }: Props) {
  const { lang, course: slug } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const course = getCourse(lang, slug); const article = getArticle(lang, slug); if (!course || !article) notFound();
  const t = await getTranslations({ locale: lang, namespace: 'Course' });
  const ui = await getTranslations({ locale: lang, namespace: 'Ui' });
  const groups = groupModules(course.lessons);
  const first = course.lessons[0];
  const isIntroduction = course.section === 'introduction';
  const hasArtwork = isIntroduction || course.slug === 'llm-101' || course.slug === 'coding-101' || course.slug === 'agent-101';
  return <div className="relative left-[calc((100vw-100%)/2)] mx-auto w-[min(64rem,100%)] flex-[1_0_auto] self-center"><main id="main-content" className="[&_[role=note]]:mt-5" tabIndex={-1}>
    <section data-slot="course-hero" className="overflow-x-clip px-7 py-14 max-[721px]:px-4 max-[721px]:py-7">
      <HeroGrid className={hasArtwork ? undefined : 'grid-cols-1'}>
        <HeroCopy>
          <p className="m-0 mb-5 flex flex-wrap font-mono text-xs leading-normal text-muted-foreground">
            <span>{ui(course.section ?? course.level)}</span>
            <span aria-hidden> · </span>
            <span>{t('free')}</span>
          </p>
          <PageTitle variant="hero" className="font-pixel font-normal text-balance">{course.title}</PageTitle>
          <HeroLead className="mb-[22px]">{course.description}</HeroLead>
          {first && <PageActions className="mt-0">
            <HeroPrimaryAction href={first.url}>{t('startFirst')}</HeroPrimaryAction>
          </PageActions>}
        </HeroCopy>
        {hasArtwork && <div className={`relative justify-self-center overflow-hidden bg-transparent max-[841px]:hidden ${isIntroduction ? 'aspect-[450.06/515.9] w-[min(100%,280px)] max-[1101px]:w-[min(100%,240px)]' : 'aspect-[720/570] w-[min(100%,420px)]'}`}>{isIntroduction ? <MacExplode /> : course.slug === 'agent-101' ? <ServoExplode callouts /> : course.slug === 'coding-101' ? <RocketExplode callouts /> : <ChipExplode callouts />}</div>}
      </HeroGrid>
    </section>
    <section className="px-7 pt-12 pb-[72px] max-[721px]:px-4 max-[721px]:pt-8 max-[721px]:pb-12" aria-labelledby="course-catalog">
      <h2 id="course-catalog" className="m-0 mb-6 font-mono text-xs font-normal text-muted-foreground">{t('catalog')}</h2>
      {groups.length ? <div className="grid grid-cols-2 gap-5 max-[841px]:grid-cols-1">
        {groups.map((group, index) => <section key={group.module} className="overflow-hidden rounded-xl border border-border bg-background">
          <h3 className="m-0 flex items-baseline gap-3 p-4 font-sans text-base leading-snug font-semibold text-foreground"><span className="font-mono text-caption font-medium text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>{group.title}</h3>
          <ol className="m-0 list-none p-0">{group.lessons.map(({ lesson, part }) => <li key={lesson.id}>
            <Link className="flex items-center gap-4 border-t border-line-soft px-4 py-[11px] text-inherit no-underline hover:bg-surface" href={lesson.url}>
              <span className="w-7 shrink-0 font-mono text-xs text-muted-foreground">{part}</span>
              <span className="min-w-0 flex-1 text-ui">{lesson.title}</span>
            </Link>
          </li>)}</ol>
        </section>)}
      </div> : <div data-slot="course-empty" className="border border-border bg-surface p-6">
        <h3 className="m-0 text-lg font-semibold">{t('updating')}</h3>
        <p className="m-0 mt-2 text-ui text-muted-foreground">{t('updatingBody')}</p>
      </div>}
    </section>
  </main></div>;
}
