/**
 * [INPUT]: Public lesson, current-language manifest, MDX registry, and progress controls.
 * [OUTPUT]: Lesson article at /{lang}/courses/{course}/{lesson}, with eyebrow, prose, completion row, prev/next cards, and an h2 table of contents.
 * [POS]: Lesson route inside the shared course shell; both static generation and runtime access enforce publication policy.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale, htmlLanguages } from '@/lib/i18n/config';
import { courseLabel, groupModules } from '@/lib/content/modules';
import { getCatalog, getCourse, getLesson, getArticle } from '@/lib/content/source';
import { identity } from '@/lib/content/types';
import { getMDXComponents } from '@/components/mdx/components';
import { LessonCompletion } from '@/components/progress/lesson-completion';
import { LessonNavigation } from '@/components/course/lesson-navigation';
import { pageMetadata } from '@/lib/seo/metadata';
import { TranslationNotice } from '@/components/course/translation-notice';
type Props = { params: Promise<{ lang: string; course: string; lesson: string[] }> };
export function generateStaticParams() { return getCatalog().documents.filter((doc) => doc.data.kind === 'lesson').map((doc) => ({ lang: doc.locale, course: doc.courseSlug, lesson: [doc.slug.at(-1)!] })); }
export async function generateMetadata({ params }: Props) {
  const { lang, course, lesson } = await params; if (!isLocale(lang)) return {};
  const doc = getLesson(lang, course, lesson); return doc ? pageMetadata(lang, doc.url, doc.data.title, doc.data.description, identity(doc)) : {};
}
export default async function LessonPage({ params }: Props) {
  const { lang, course: slug, lesson } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const course = getCourse(lang, slug); const doc = getLesson(lang, slug, lesson); const article = getArticle(lang, slug, lesson);
  if (!course || !doc || !article || doc.data.kind !== 'lesson') notFound();
  const t = await getTranslations({ locale: lang, namespace: 'Course' });
  const ui = await getTranslations({ locale: lang, namespace: 'Ui' });
  const Body = article.data.body;
  const number = course.lessons.findIndex((item) => item.url === doc.url) + 1;
  const groups = groupModules(course.lessons);
  const groupIndex = groups.findIndex((group) => group.lessons.some((item) => item.lesson.url === doc.url));
  const group = groups[groupIndex];
  const toc = (article.data.toc ?? []).filter((item) => item.depth === 2);
  const verified = doc.data.lastVerified && ui('verified', { date: new Intl.DateTimeFormat(htmlLanguages[lang], { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${doc.data.lastVerified}T00:00:00Z`)) });
  return <>
    <article id="main-content" className="learn-main learn-reading" tabIndex={-1}>
      <nav className="learn-crumb" aria-label={ui('overview')}><Link href={course.url}>{courseLabel(course.slug)}</Link><span aria-hidden>/</span><b aria-current="page">{doc.data.title}</b></nav>
      {group && <p className="learn-kicker">{String(groupIndex + 1).padStart(2, '0')} · {group.title} · {ui('lessonNumber', { number })}</p>}
      <h1>{doc.data.title}</h1>
      <p className="learn-lead">{doc.data.description}</p>
      <p className="learn-meta"><span>{ui(doc.data.lessonType)}</span><span>{ui('minutes', { count: doc.data.durationMinutes })}</span></p>
      {(verified || doc.data.testedWith) && <p className="learn-note">{[verified, doc.data.testedWith && ui('testedWith', { environment: doc.data.testedWith })].filter(Boolean).join(' · ')}</p>}
      <TranslationNotice document={doc} sourceLocale={course.sourceLocale} />
      <div className="prose"><Body components={getMDXComponents()} /></div>
      <LessonCompletion lessonId={doc.data.lessonId} />
      <LessonNavigation course={course} lessonId={doc.data.lessonId} />
    </article>
    {toc.length > 0 && <aside className="learn-out learn-toc"><div className="learn-out-in"><b>{t('onThisPage')}</b><nav aria-label={t('onThisPage')}>{toc.map((item) => <a key={item.url} href={item.url}>{item.title}</a>)}</nav></div></aside>}
  </>;
}
