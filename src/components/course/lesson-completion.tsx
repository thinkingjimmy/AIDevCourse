'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { useLearning } from '@/components/progress/progress-provider';
import { Button } from '@/components/ui/button';
import { CourseCompletionDialog } from './course-completion-dialog';

export function LessonCompletion({ lessonId }: { lessonId: string }) {
  const t = useTranslations('Ui');
  const router = useRouter();
  const { course, learning, ready, courseCompleted, complete } = useLearning();
  const [celebratingLesson, setCelebratingLesson] = useState<string>();
  const [pending, startTransition] = useTransition();
  const index = course.lessons.findIndex((lesson) => lesson.id === lessonId);
  const next = course.lessons[index + 1]?.url ?? course.url;
  const isComplete = Object.hasOwn(learning.completed, lessonId);
  const isFinalLesson = index >= 0 && index === course.lessons.length - 1;
  const hasCompletionAchievement = course.achievements.some((achievement) => achievement.kind === 'course-completion');
  const celebrateFinalLesson = isFinalLesson && hasCompletionAchievement;
  const open = celebratingLesson === lessonId;

  return <div data-slot="lesson-completion" className="mt-8 flex justify-end">
    <Button variant="action" size="action" className="h-auto min-h-11 rounded-sm border-brand bg-brand py-3 leading-snug whitespace-normal hover:bg-brand/90 active:bg-brand focus-visible:outline-brand max-sm:w-full" disabled={!ready || pending || open || index < 0} aria-busy={pending} title={ready ? undefined : t('noJs')} onClick={() => {
      if (!isComplete && !complete(lessonId)) return;
      if (!isComplete && celebrateFinalLesson) {
        setCelebratingLesson(lessonId);
        return;
      }
      startTransition(() => router.push(next));
    }}>
      <CheckCircleIcon size={18} aria-hidden />
      <span className="min-w-0 wrap-anywhere">{t(isComplete ? celebrateFinalLesson ? 'finishCourse' : 'nextChapter' : 'markComplete')}</span>
    </Button>
    {hasCompletionAchievement && <CourseCompletionDialog open={open} courseTitle={course.title} completed={courseCompleted} saveFailed={learning.failed} onClose={() => {
      setCelebratingLesson(undefined);
      startTransition(() => router.push(course.url));
    }} />}
  </div>;
}
