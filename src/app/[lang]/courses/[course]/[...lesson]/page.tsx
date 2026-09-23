/**
 * [INPUT]: Public lesson, current-language manifest, MDX registry, and progress controls.
 * [OUTPUT]: Static lesson with number/type/duration meta, current-language TOC, verification metadata, and footer controls.
 * [POS]: Lesson route; both static generation and runtime access enforce publication policy.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DocsPage, DocsTitle, DocsDescription, DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { Clock3 } from 'lucide-react';
import { isLocale, htmlLanguages } from '@/lib/i18n/config';
import { getCatalog, getCourse, getLesson, getArticle } from '@/lib/content/source';
import { identity } from '@/lib/content/types';
import { getMDXComponents } from '@/components/mdx/components';
import { LessonCompletion } from '@/components/progress/lesson-completion';
import { LessonNavigation } from '@/components/course/lesson-navigation';
import { pageMetadata } from '@/lib/seo/metadata';
import { TranslationNotice } from '@/components/course/translation-notice';
type Props = { params: Promise<{ lang: string; course: string; lesson: string[] }> };
export function generateStaticParams() { return getCatalog().documents.filter((doc) => doc.data.kind === 'lesson').map((doc) => ({ lang: doc.locale, course: doc.courseSlug, lesson: doc.slug })); }
export async function generateMetadata({ params }: Props) {
  const { lang, course, lesson } = await params; if (!isLocale(lang)) return {};
  const doc = getLesson(lang, course, lesson); return doc ? pageMetadata(lang, doc.url, doc.data.title, doc.data.description, identity(doc)) : {};
}
export default async function LessonPage({ params }: Props) {
  const { lang, course: slug, lesson } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const course = getCourse(lang, slug); const doc = getLesson(lang, slug, lesson); const article = getArticle(lang, slug, lesson);
  if (!course || !doc || !article || doc.data.kind !== 'lesson') notFound();
  const t = await getTranslations({ locale: lang, namespace: 'Ui' });
  const Body = article.data.body;
  const number = course.lessons.findIndex((item) => item.url === doc.url) + 1;
  const verified = doc.data.lastVerified && t('verified', { date: new Intl.DateTimeFormat(htmlLanguages[lang], { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${doc.data.lastVerified}T00:00:00Z`)) });
  return <DocsPage id="main-content" tabIndex={-1} toc={article.data.toc} footer={{ enabled: false }} breadcrumb={{ enabled: false }}>
    <div className="lesson-breadcrumb"><Link href={course.url}>{course.title}</Link><span aria-hidden>/</span><span>{course.lessons[number - 1]?.moduleTitle}</span></div>
    <div className="lesson-meta"><span className="mono">{t('lessonNumber', { number })}</span><span className="chip">{t(doc.data.lessonType)}</span><span className="chip"><Clock3 size={13} aria-hidden />{t('minutes', { count: doc.data.durationMinutes })}</span></div>
    <DocsTitle>{doc.data.title}</DocsTitle><DocsDescription>{doc.data.description}</DocsDescription>
    <div className="article-meta">{verified && <span>{verified}</span>}{doc.data.testedWith && <span>{t('testedWith', { environment: doc.data.testedWith })}</span>}</div>
    <TranslationNotice document={doc} sourceLocale={course.sourceLocale} />
    <DocsBody><Body components={getMDXComponents()} /></DocsBody>
    <LessonCompletion lessonId={doc.data.lessonId} /><LessonNavigation course={course} lessonId={doc.data.lessonId} />
  </DocsPage>;
}
