import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { isLocale } from '@/lib/i18n/config';
import { groupModules } from '@/lib/content/model';
import { getCatalog, getCourse, getArticle } from '@/lib/content/source';
import { HeroPrimaryAction } from '@/components/layout/page-primitives';
import { CourseDisk } from '@/components/course/course-card';
import { pageMetadata } from '@/lib/metadata';

type Props = { params: Promise<{ lang: string; course: string }> };
export function generateStaticParams() { return getCatalog().courses.map(course => ({ lang: course.locale, course: course.slug })); }
export async function generateMetadata({ params }: Props) {
  const { lang, course: slug } = await params; if (!isLocale(lang)) return {};
  const course = getCourse(lang, slug); return course ? pageMetadata(lang, course.url, course.title, course.description, course.id) : {};
}
export default async function CoursePage({ params }: Props) {
  const { lang, course: slug } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const course = getCourse(lang, slug); if (!course || !getArticle(lang, slug)) notFound();
  const t = await getTranslations({ locale: lang, namespace: 'Course' });
  const ui = await getTranslations({ locale: lang, namespace: 'Ui' });
  const home = await getTranslations({ locale: lang, namespace: 'Home' });
  const groups = groupModules(course.lessons);
  const first = course.lessons[0];
  const level = course.section === 'introduction' ? home('gettingStarted') : ui(course.level);
  const count = ui('lessonCount', { count: course.lessons.length });
  return <main id="main-content" className="course-overview" tabIndex={-1}>
    <section data-slot="course-hero" className="course-overview-hero">
      <div>
        <p className="course-overview-meta"><span>{level}</span><span aria-hidden>·</span><span>{t('free')}</span><span aria-hidden>·</span><span>{count}</span></p>
        <h1>{course.title}</h1>
        <p className="course-overview-description">{course.description}</p>
        {first && <HeroPrimaryAction href={first.url}>{t('startFirst')}</HeroPrimaryAction>}
      </div>
      <div className="course-disk-cover" aria-hidden="true"><CourseDisk course={{ ...course, lessonCount: course.lessons.length }} labels={{ level, status: first ? count : t('updating') }} /></div>
    </section>
    <section className="course-directory" aria-labelledby="course-catalog">
      <h2 id="course-catalog">{t('catalog')}</h2>
      {groups.length ? <div className="course-directory-groups">
        {groups.map((group, index) => <section key={group.module} className="course-directory-group">
          <h3><span>{String(index + 1).padStart(2, '0')}</span>{group.title}</h3>
          <ol>{group.lessons.map(({ lesson, part }) => <li key={lesson.id}>
            <Link href={lesson.url}><span>{part}</span><span>{lesson.title}</span><ArrowRightIcon size={14} aria-hidden /></Link>
          </li>)}</ol>
        </section>)}
      </div> : <div data-slot="course-empty" className="border border-border bg-surface p-6">
        <h3 className="m-0 text-lg font-semibold">{t('updating')}</h3>
        <p className="m-0 mt-2 text-ui text-muted-foreground">{t('updatingBody')}</p>
      </div>}
    </section>
  </main>;
}
