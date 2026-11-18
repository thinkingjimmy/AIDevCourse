import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { getCourse, getLesson } from '@/lib/content/source';
import { loadLessonContent } from '@/components/course/reader/content';
import { LearningProvider } from '@/components/progress/progress-provider';

type Props = { params: Promise<{ lang: string; course: string; lesson: string[] }> };

export const dynamic = 'force-dynamic';

export default async function EmbedLessonPage({ params }: Props) {
  const { lang, course, lesson } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  const doc = getLesson(lang, course, lesson);
  const courseManifest = getCourse(lang, course);
  if (!doc || doc.data.kind !== 'lesson' || !courseManifest) notFound();
  const { content } = await loadLessonContent(doc);
  return (
    <LearningProvider course={courseManifest}>
      <main className="@container/lesson min-h-dvh bg-background px-5 py-8 text-foreground sm:px-8">
        <div className="mx-auto w-full max-w-[51rem]">{content}</div>
      </main>
    </LearningProvider>
  );
}
