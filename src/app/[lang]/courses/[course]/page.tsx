/**
 * [INPUT]: Public course introduction, module groups, and the exploded-chip figure.
 * [OUTPUT]: Course overview: homepage-style hero (title, description, first-lesson action, and stats), a full-bleed rule, then a two-column module syllabus. No sidebar.
 * [POS]: Course overview inside the shared learning shell; the introduction never counts as a lesson.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { courseLabel, groupModules } from '@/lib/content/modules';
import { getCatalog, getCourse, getArticle } from '@/lib/content/source';
import { ChipExplode } from '@/components/course/chip-explode';
import { pageMetadata } from '@/lib/seo/metadata';
import { TranslationNotice } from '@/components/course/translation-notice';
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
  const document = getCatalog().documents.find((doc) => doc.url === course.url);
  const stats = [t('moduleCount', { count: groups.length }), ui('lessonCount', { count: course.lessons.length }), ui('minutes', { count: course.durationMinutes })].join(' · ');
  return <main id="main-content" className="course-overview" tabIndex={-1}>
    <section className="home-hero-wrap">
      <div className="home-hero">
        <div className="home-copy">
          <p className="course-crumb">
            <span>{courseLabel(course.slug)}</span>
            <span aria-hidden> · </span>
            <span>{ui(course.level)}</span>
            <span aria-hidden> · </span>
            <span>{t('free')}</span>
          </p>
          <h1>{course.title}</h1>
          <p className="home-sub">{course.description}</p>
          {first && <div className="home-ctas">
            <Link className="home-cta" href={first.url}>{t('startFirst')}<span aria-hidden> →</span></Link>
            <p className="course-stats">{stats}</p>
          </div>}
          {document && <TranslationNotice document={document} sourceLocale={course.sourceLocale} />}
        </div>
        <div className="course-chip"><ChipExplode /></div>
      </div>
    </section>
    <hr className="course-bleed-rule" />
    <section className="course-syllabus" aria-labelledby="course-catalog">
      <p id="course-catalog" className="course-syllabus-label">{t('catalog')}</p>
      <div className="course-modules">
        {groups.map((group, index) => <section key={group.module} className="course-module">
          <h2><span className="mono">{String(index + 1).padStart(2, '0')}</span>{group.title}</h2>
          <ol>{group.lessons.map(({ lesson, part }) => <li key={lesson.id}>
            <Link href={lesson.url}>
              <span className="idx">{part}</span>
              <span className="ttl">{lesson.title}</span>
              <span className="mins">{ui('minutes', { count: lesson.durationMinutes })}</span>
            </Link>
          </li>)}</ol>
        </section>)}
      </div>
    </section>
  </main>;
}
