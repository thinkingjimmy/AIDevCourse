'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { useLearning } from '@/components/progress/progress-provider';
import { Button } from '@/components/ui/button';

export function LessonCompletion({ lessonId }: { lessonId: string }) {
  const t = useTranslations('Ui');
  const router = useRouter();
  const { course, learning, ready, complete } = useLearning();
  const [pending, startTransition] = useTransition();
  const index = course.lessons.findIndex((lesson) => lesson.id === lessonId);
  const next = course.lessons[index + 1]?.url ?? course.url;
  const isComplete = Object.hasOwn(learning.completed, lessonId);

  return <div data-slot="lesson-completion" className="mt-8 flex justify-end">
    <Button variant="action" size="action" className="h-auto min-h-11 rounded-sm py-3 leading-snug whitespace-normal max-sm:w-full" disabled={!ready || pending || index < 0} aria-busy={pending} title={ready ? undefined : t('noJs')} onClick={() => {
      if (!isComplete && !complete(lessonId)) return;
      startTransition(() => router.push(next));
    }}>
      <CheckCircleIcon size={18} aria-hidden />
      {t(isComplete ? 'nextChapter' : 'markComplete')}
    </Button>
  </div>;
}
