import { PageTitle } from '@/components/layout/page-primitives';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { getCatalog, getCourse, getLesson, getArticle } from '@/lib/content/source';
import { identity } from '@/lib/content/model';
import { getMDXComponents } from '@/components/mdx/components';
import { LessonVisit } from '@/components/progress/lesson-visit';
import { LessonCompletion } from '@/components/course/lesson-completion';
import { LessonToc } from '@/components/course/outline/lesson-toc';
import { NoteRail, NoteScope } from '@/components/mdx/notes/note-scope';
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
  const hasToc = toc.length > 0;
  return <NoteScope key={doc.url} data-slot="lesson-reading-group" className={cn(
    'mx-auto grid w-full max-w-[51rem] min-w-0 grid-cols-[minmax(0,1fr)] items-start',
    doc.hasJimmyNotes && '@[64rem]/lesson:max-w-[74rem] @[64rem]/lesson:grid-cols-[minmax(0,1fr)_23rem]',
  )}>
    {hasToc && <LessonToc items={toc} label={t('onThisPage')} hasNotes={doc.hasJimmyNotes} />}
    <article id="main-content" className="block min-w-0 pt-9 pb-20 max-[961px]:pt-7 max-[961px]:pb-[72px]" tabIndex={-1}>
      <PageTitle variant="lesson">{doc.data.title}</PageTitle>
      {doc.data.description ? <p className="m-0 mb-5 max-w-none text-base leading-body text-muted-foreground">{doc.data.description}</p> : null}
      <div className="prose course-prose"><Body components={getMDXComponents(doc.achievements)} /></div>
      <LessonVisit lessonId={doc.data.lessonId} />
      <LessonCompletion lessonId={doc.data.lessonId} />
    </article>
    {doc.hasJimmyNotes && <NoteRail className="ml-8" />}
  </NoteScope>;
}
