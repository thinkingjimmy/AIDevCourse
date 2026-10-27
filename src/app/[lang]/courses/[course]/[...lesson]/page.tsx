/**
 * [INPUT]: Public lesson with validated achievements, MDX registry, recent-visit recording, and the lesson shell's named reading container.
 * [OUTPUT]: A bounded article and optional h2 TOC centered together in the space beside the sidebar, with container-based reflow.
 * [POS]: Lesson route inside the wiki shell; both static generation and runtime access enforce publication policy.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { PageTitle } from '@/components/layout/page-primitives';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { getCatalog, getCourse, getLesson, getArticle } from '@/lib/content/source';
import { identity } from '@/lib/content/model';
import { getMDXComponents } from '@/components/mdx/components';
import { LessonVisit } from '@/components/progress/lesson-visit';
import { LessonNavigation } from '@/components/course/lesson-navigation';
import { pageMetadata } from '@/lib/metadata';
import { cn } from '@/lib/utils';
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
  const Body = article.data.body;
  const toc = (article.data.toc ?? []).filter((item) => item.depth === 2);
  return <div data-slot="lesson-reading-group" className={cn(
    'mx-auto grid w-full max-w-[42.5rem] min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-x-8',
    toc.length > 0 && '@4xl/lesson:max-w-4xl @4xl/lesson:grid-cols-[minmax(0,1fr)_11.5rem]',
  )}>
    <article id="main-content" className="block min-w-0 pt-9 pb-20 max-[961px]:pt-7 max-[961px]:pb-[72px]" tabIndex={-1}>
      <PageTitle variant="lesson">{doc.data.title}</PageTitle>
      {doc.data.description ? <p className="m-0 mb-5 max-w-none text-base leading-body text-muted-foreground">{doc.data.description}</p> : null}
      <div className="prose course-prose"><Body components={getMDXComponents(doc.achievements)} /></div>
      <LessonVisit lessonId={doc.data.lessonId} />
      <LessonNavigation course={course} lessonId={doc.data.lessonId} />
    </article>
    {toc.length > 0 && <aside data-slot="lesson-toc" className="sticky top-7 hidden min-w-0 pt-9 pb-12 text-caption leading-copy text-muted-foreground @4xl/lesson:block"><b className="m-0 mb-2 block text-xs font-semibold text-foreground">{t('onThisPage')}</b><nav aria-label={t('onThisPage')}>{toc.map((item) => <a className="block py-1 text-muted-foreground no-underline hover:text-foreground" key={item.url} href={item.url}>{item.title}</a>)}</nav></aside>}
  </div>;
}
