import Link from 'next/link';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { groupModules } from '@/lib/content/model';
import { getCatalog, getCourse, getArticle } from '@/lib/content/source';
import { Button } from '@/components/ui/button';
import { PageTitle, PageActions, HeroGrid, HeroCopy, HeroLead } from '@/components/layout/page-primitives';
import { ChipExplode } from '@/components/illustrations/chip-explode';
import { RocketExplode } from '@/components/illustrations/rocket-explode';
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
  return <div className="relative left-[calc((100vw-100%)/2)] mx-auto min-h-[calc(100vh-56px)] w-[min(64rem,100%)] self-center"><main id="main-content" className="[&_[role=note]]:mt-5" tabIndex={-1}>
    <section className="overflow-x-clip px-7 pt-[70px] pb-[72px] max-[721px]:px-4 max-[721px]:pt-9 max-[721px]:pb-7">
      <HeroGrid>
        <HeroCopy>
          <p className="m-0 mb-5 flex flex-wrap font-mono text-xs leading-normal text-muted-foreground">
            <span>{ui(course.level)}</span>
            <span aria-hidden> · </span>
            <span>{t('free')}</span>
          </p>
          <PageTitle variant="hero" className="font-pixel font-normal">{course.title}</PageTitle>
          <HeroLead className="mb-[22px]">{course.description}</HeroLead>
          {first && <PageActions className="mt-0">
            <Button asChild variant="action-raised" size="action"><Link href={first.url} target="_blank" rel="noopener">{t('startFirst')}<ArrowRightIcon size={16} aria-hidden /></Link></Button>
          </PageActions>}
        </HeroCopy>
        <div className="relative aspect-[720/570] w-[min(100%,420px)] justify-self-center overflow-hidden bg-transparent max-[841px]:w-[min(100%,320px)]">{course.slug === 'coding-101' ? <RocketExplode callouts /> : <ChipExplode callouts />}</div>
      </HeroGrid>
    </section>
    <hr className="relative left-1/2 m-0 -ml-[50vw] h-0 w-screen border-0 border-t border-border" />
    <section className="px-7 pt-14 pb-24 max-[721px]:px-4 max-[721px]:pt-9 max-[721px]:pb-[72px]" aria-labelledby="course-catalog">
      <h2 id="course-catalog" className="m-0 mb-6 font-mono text-xs font-normal text-muted-foreground">{t('catalog')}</h2>
      {groups.length ? <div className="grid grid-cols-2 gap-5 max-[841px]:grid-cols-1">
        {groups.map((group, index) => <section key={group.module} className="overflow-hidden rounded-xl border border-border bg-background">
          <h3 className="m-0 flex items-baseline gap-3 p-4 font-sans text-base leading-snug font-semibold text-foreground"><span className="font-mono text-caption font-medium text-faint">{String(index + 1).padStart(2, '0')}</span>{group.title}</h3>
          <ol className="m-0 list-none p-0">{group.lessons.map(({ lesson, part }) => <li key={lesson.id}>
            <Link className="flex items-center gap-4 border-t border-line-soft px-4 py-[11px] text-inherit no-underline hover:bg-surface" href={lesson.url} target="_blank" rel="noopener">
              <span className="w-7 shrink-0 font-mono text-xs text-faint">{part}</span>
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
