/**
 * [INPUT]: Public course introduction, MDX registry, syllabus rows, and the continue action.
 * [OUTPUT]: Course overview: breadcrumb, facts, ordered syllabus, then the introduction.
 * [POS]: Course overview inside the shared learning shell; the introduction never counts as a lesson.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { courseLabel, groupModules } from '@/lib/content/modules';
import { getCatalog, getCourse, getArticle } from '@/lib/content/source';
import { CourseCatalog, CourseContinue } from '@/components/course/course-layout';
import { getMDXComponents } from '@/components/mdx/components';
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
  const Body = article.data.body;
  const document = getCatalog().documents.find((doc) => doc.url === course.url);
  return <main id="main-content" className="learn-main" tabIndex={-1}>
    <nav className="learn-crumb" aria-label={ui('courses')}><Link href={`/${lang}/courses`}>{ui('courses')}</Link><span aria-hidden>/</span><b aria-current="page">{courseLabel(course.slug)}</b></nav>
    <h1>{course.title}</h1>
    <p className="learn-lead">{course.description}</p>
    <p className="learn-meta">
      <span>{ui(course.level)}</span>
      <span>{t('moduleCount', { count: groupModules(course.lessons).length })}</span>
      <span>{ui('lessonCount', { count: course.lessons.length })}</span>
      <span>{ui('minutes', { count: course.durationMinutes })}</span>
      <span>{t('free')}</span>
    </p>
    <CourseContinue />
    {document && <TranslationNotice document={document} sourceLocale={course.sourceLocale} />}
    <div className="learn-facts">
      <div><h2>{t('learn')}</h2><p>{course.goals.join(' · ')}</p></div>
      <div><h2>{t('who')}</h2><p>{course.audience}</p></div>
      <div><h2>{t('before')}</h2><p>{course.prerequisites.join(' · ')}</p></div>
    </div>
    <CourseCatalog />
    <div className="prose"><Body components={getMDXComponents()} /></div>
  </main>;
}
