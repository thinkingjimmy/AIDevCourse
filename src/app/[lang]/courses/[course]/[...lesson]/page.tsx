import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { getCatalog, getCourse, getLesson } from '@/lib/content/source';
import { identity } from '@/lib/content/model';
import { LessonToc } from '@/components/course/outline/lesson-toc';
import { LessonRegion } from '@/components/course/course-layout';
import { loadLessonContent, loadReadingPanes } from '@/components/course/reader/content';
import { LessonReader } from '@/components/course/reader/reader';
import type { ReadingSearch } from '@/components/course/reader/model';
import { pageMetadata } from '@/lib/metadata';
type Props = { params: Promise<{ lang: string; course: string; lesson: string[] }>; searchParams: Promise<ReadingSearch> };
export function generateStaticParams() { return getCatalog().documents.filter((doc) => doc.data.kind === 'lesson').map((doc) => ({ lang: doc.locale, course: doc.courseSlug, lesson: [doc.slug.at(-1)!] })); }
export async function generateMetadata({ params }: Props) {
  const { lang, course, lesson } = await params; if (!isLocale(lang)) return {};
  const doc = getLesson(lang, course, lesson); return doc ? pageMetadata(lang, doc.url, doc.data.title, doc.data.description, identity(doc)) : {};
}
export default async function LessonPage({ params, searchParams }: Props) {
  const { lang, course: slug, lesson } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const course = getCourse(lang, slug); const doc = getLesson(lang, slug, lesson);
  if (!course || !doc || doc.data.kind !== 'lesson') notFound();
  const t = await getTranslations({ locale: lang, namespace: 'Course' });
  const [{ content, toc: headings }, reading] = await Promise.all([
    loadLessonContent(doc), loadReadingPanes(await searchParams, doc.url, lang),
  ]);
  const toc = (headings ?? []).filter(item => item.depth === 2);
  const hasToc = toc.length > 0;
  return <LessonReader source={doc.url} {...reading}>
    {hasToc && <LessonToc items={toc} label={t('onThisPage')} hasNotes={doc.hasJimmyNotes} />}
    <LessonRegion key={doc.url} title={doc.data.title} hasToc={hasToc}>
      {content}
    </LessonRegion>
  </LessonReader>;
}
