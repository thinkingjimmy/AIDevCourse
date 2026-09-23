/**
 * [INPUT]: Public course introduction, components/mdx registry, course syllabus, and progress controls.
 * [OUTPUT]: Banded overview: hero with progress, goals/prerequisites/audience, introduction, and ordered syllabus.
 * [POS]: Course overview route outside the reading shell; introduction never counts as a lesson.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Check } from 'lucide-react';
import { isLocale } from '@/lib/i18n/config';
import { getCatalog, getCourse, getArticle } from '@/lib/content/source';
import { CourseProgress } from '@/components/progress/progress-controls';
import { Syllabus } from '@/components/course/syllabus';
import { GridFrame } from '@/components/layout/grid-frame';
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
  return <main id="main-content" className="site-main" tabIndex={-1}>
    <GridFrame className="course-hero">
      <div className="course-hero-copy">
        <nav className="breadcrumb" aria-label={ui('courses')}><Link href={`/${lang}/courses`}>{ui('courses')}</Link><span aria-hidden>/</span><span aria-current="page">{course.title}</span></nav>
        <div className="chip-row"><span className="chip">{ui(course.level)}</span><span className="chip">{ui('lessonCount', { count: course.lessons.length })}</span><span className="chip">{ui('minutes', { count: course.durationMinutes })}</span></div>
        <h1 className="serif">{course.title}</h1><p>{course.description}</p>
        <TranslationNotice document={getCatalog().documents.find((doc) => doc.url === course.url)!} sourceLocale={course.sourceLocale} />
      </div>
      <div className="course-hero-progress"><CourseProgress /></div>
    </GridFrame>
    <GridFrame className="course-facts">
      <section><h2>{t('goals')}</h2><ul>{course.goals.map((goal) => <li key={goal}><Check size={16} aria-hidden />{goal}</li>)}</ul></section>
      <section><h2>{t('prerequisites')}</h2><ul>{course.prerequisites.map((item, index) => <li key={item}><span className="mono" aria-hidden>{String.fromCharCode(97 + index)}.</span>{item}</li>)}</ul></section>
      <section><h2>{t('audience')}</h2><p>{course.audience}</p></section>
    </GridFrame>
    <GridFrame className="course-intro"><div className="prose"><Body components={getMDXComponents()} /></div></GridFrame>
    <GridFrame className="course-path">
      <header><div><p className="eyebrow">{t('syllabus')}</p><h2 className="serif">{t('pathTitle')}</h2></div><p>{t('pathNote')}</p></header>
      <Syllabus variant="full" />
    </GridFrame>
  </main>;
}
