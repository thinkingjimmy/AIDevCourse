import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getLesson } from '@/lib/content/source';
import { identity } from '@/lib/content/model';
import type { Locale } from '@/lib/i18n/config';
import { pageMetadata } from '@/lib/metadata';
import { LessonToc } from '../outline/lesson-toc';
import { LessonRegion } from '../course-layout';
import { loadLessonContent, loadReadingPanes } from './content';
import { LessonReader } from './reader';
import type { ReadingSearch } from './model';

export function lessonMetadata(locale: Locale, course: string, lesson: string[]) {
  const doc = getLesson(locale, course, lesson);
  return doc ? pageMetadata(locale, doc.url, doc.data.title, doc.data.description, identity(doc)) : {};
}

export async function LessonPage({ locale, course, lesson, searchParams }: {
  locale: Locale; course: string; lesson: string[]; searchParams: Promise<ReadingSearch>;
}) {
  const doc = getLesson(locale, course, lesson);
  if (!doc || doc.data.kind !== 'lesson') notFound();
  const t = await getTranslations({ locale, namespace: 'Course' });
  const [{ content, toc: headings }, reading] = await Promise.all([
    loadLessonContent(doc), loadReadingPanes(await searchParams, doc.url, locale),
  ]);
  const toc = (headings ?? []).filter(item => item.depth === 2);
  const hasToc = toc.length > 0;
  return <LessonReader source={doc.url} {...reading}>
    {hasToc && <LessonToc items={toc} label={t('onThisPage')} hasNotes={doc.hasJimmyNotes} />}
    <LessonRegion key={doc.url} title={doc.data.title} hasToc={hasToc}>{content}</LessonRegion>
  </LessonReader>;
}
