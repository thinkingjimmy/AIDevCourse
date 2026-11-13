import { PageTitle } from '@/components/layout/page-primitives';
import { getMDXComponents } from '@/components/mdx/components';
import { NoteRail, NoteScope } from '@/components/mdx/notes/note-scope';
import { LearningProvider } from '@/components/progress/progress-provider';
import { LessonVisit } from '@/components/progress/lesson-visit';
import { getArticle } from '@/lib/content/source/articles';
import { getCatalog, getCourse } from '@/lib/content/source';
import type { ContentDocument } from '@/lib/content/model';
import type { Locale } from '@/lib/i18n/config';
import { site } from '@/lib/site-config';
import { cn } from '@/lib/utils';
import { LessonArticle } from '../feedback/lesson-article';
import { LessonCompletion } from '../lesson-completion';
import { CourseOverview } from '../overview/course-overview';
import { ReadingFailure } from './reader';
import { readingPaths, readingPrefix, type ReadingPane, type ReadingSearch } from './model';

export async function loadLessonContent(doc: ContentDocument, reference = false) {
  const article = getArticle(doc);
  if (!article || doc.data.kind !== 'lesson') throw new Error('Lesson unavailable');
  const { body: Body, toc } = await article.load();
  const scope = reference ? { prefix: readingPrefix(doc.url), pageUrl: doc.url } : undefined;
  const content = <NoteScope data-slot="lesson-reading-group" className={cn(
    'mx-auto grid w-full max-w-[51rem] min-w-0 grid-cols-[minmax(0,1fr)] items-start',
    doc.hasJimmyNotes && '@[64rem]/lesson:max-w-[74rem] @[64rem]/lesson:grid-cols-[minmax(0,1fr)_23rem]',
  )}>
    <LessonArticle title={doc.data.title} pageUrl={new URL(doc.url, site.origin).href} primary={!reference}>
      {reference ? <h2 tabIndex={-1} className="m-0 mb-3 text-3xl leading-heading font-semibold tracking-heading text-brand">{doc.data.title}</h2>
        : <PageTitle variant="lesson">{doc.data.title}</PageTitle>}
      {doc.data.description ? <p className="m-0 mb-5 max-w-none text-base leading-body text-muted-foreground">{doc.data.description}</p> : null}
      <div className="prose course-prose"><Body components={getMDXComponents(doc.achievements, scope)} /></div>
      <LessonVisit lessonId={doc.data.lessonId} />
      {!reference && <LessonCompletion lessonId={doc.data.lessonId} />}
    </LessonArticle>
    {doc.hasJimmyNotes && <NoteRail className="ml-8" />}
  </NoteScope>;
  return { content, toc };
}

export async function loadReadingPanes(search: ReadingSearch, source: string, locale: Locale) {
  const catalog = getCatalog();
  const targets = catalog.documents.filter(doc => doc.locale === locale).map(doc => ({ url: doc.url, title: doc.data.title }));
  const paths = readingPaths(search.read, source, targets);
  const panes = await Promise.all(paths.map(async (href): Promise<ReadingPane> => {
    const path = href.split('#')[0];
    const doc = catalog.documents.find(doc => doc.url === path)!;
    const pane = { url: href, title: doc.data.title };
    try {
      const course = getCourse(doc.locale, doc.courseSlug);
      if (!course) throw new Error('Course unavailable');
      const body = doc.data.kind === 'lesson' ? (await loadLessonContent(doc, true)).content : await CourseOverview({ course, reference: true });
      const content = <LearningProvider course={course}>{body}</LearningProvider>;
      return { ...pane, content };
    } catch {
      return { ...pane, content: <ReadingFailure /> };
    }
  }));
  return { panes, targets };
}
