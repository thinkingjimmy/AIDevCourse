/**
 * [INPUT]: Active locale and its published course manifests.
 * [OUTPUT]: Homepage body: zinc hero, exploded Mac, and a dense catalog of real courses. The frame, header, and footer come from the locale layout.
 * [POS]: Public entry surface; counts and destinations derive from the catalog.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { getCourses } from '@/lib/content/source';
import type { CourseManifest } from '@/lib/content/types';
import { MacExplode } from '@/components/home/mac-explode';
import { EmptyCourses } from '@/components/course/empty-courses';
import { pageMetadata } from '@/lib/seo/metadata';

function seriesLabel(slug: string) {
  const [first, ...rest] = slug.split('-').filter(Boolean);
  return [first.toUpperCase(), ...rest].join(' ');
}

function catalogGroups(courses: CourseManifest[]) {
  const groups: { id: string; label: string; courses: { course: CourseManifest; fresh: boolean }[] }[] = [];
  courses.forEach((course, index) => {
    let group = groups.find((item) => item.id === course.slug);
    if (!group) {
      group = { id: course.slug, label: seriesLabel(course.slug), courses: [] };
      groups.push(group);
    }
    group.courses.push({ course, fresh: index === 0 });
  });
  return groups;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: 'Home' });
  return pageMetadata(lang, `/${lang}`, t('title').replace('\n', ' '), t('intro'));
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: 'Home' });
  const ui = await getTranslations({ locale: lang, namespace: 'Ui' });
  const course = await getTranslations({ locale: lang, namespace: 'Course' });
  const courses = getCourses(lang);
  const first = courses[0]?.lessons[0]?.url ?? courses[0]?.url;
  const groups = catalogGroups(courses);
  return <main id="main-content" className="home-page" tabIndex={-1}>
    <div className="home-inner home-hero-wrap">
      <section className="home-hero">
        <div className="home-copy">
          <p className="home-eyebrow"><span className="home-dot" aria-hidden />{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <p className="home-sub">{t('intro')}</p>
          <div className="home-ctas">
            {first
              ? <Link className="home-cta" href={first}>{t('start')}<span aria-hidden> →</span></Link>
              : <Link className="home-cta" href={`/${lang}/about`}>{course('aboutSite')}</Link>}
            <Link className="home-cta home-cta-secondary" href="#catalog">{t('browseAll')}</Link>
          </div>
        </div>
        <div className="home-deco"><MacExplode /></div>
      </section>
    </div>
    <hr className="home-rule" />
    <div className="home-inner home-catalog" id="catalog">
      <div className="home-chapter"><h2>{t('courseTitle')}</h2><p>{t('courseIntro')}</p></div>
      {courses.length ? groups.map((group) => <section className="home-series" key={group.id}>
        <h3>{group.label}</h3>
        <div className="home-grid">{group.courses.map(({ course: item, fresh }) => <Link className="home-row" key={item.id} href={item.url}>
          <b>{item.title}{fresh ? <span className="home-new">{t('newBadge')}</span> : null}</b>
          <span className="meta">{ui('lessonCount', { count: item.lessons.length })}</span>
        </Link>)}</div>
      </section>) : <EmptyCourses locale={lang} />}
    </div>
  </main>;
}
