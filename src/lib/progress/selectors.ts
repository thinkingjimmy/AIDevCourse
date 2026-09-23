/**
 * [INPUT]: Current-language lessons and shared stable-ID progress.
 * [OUTPUT]: A valid continue target and language-local progress totals.
 * [POS]: Pure learning rules, independent of storage and page rendering.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { LessonSummary } from '../content/types';
import type { Progress } from './storage';
export function selectProgress(lessons: LessonSummary[], progress: Progress) {
  const done = lessons.filter((lesson) => progress.completed[lesson.id]).length;
  const total = lessons.length;
  const allDone = total > 0 && done === total;
  const recent = lessons.find((lesson) => lesson.id === progress.last && !progress.completed[lesson.id]);
  const next = recent ?? lessons.find((lesson) => !progress.completed[lesson.id]) ?? lessons[0];
  return { done, total, allDone, percent: total ? Math.round(done / total * 100) : 0, next,
    action: allDone ? 'review' : progress.last || done ? 'continue' : 'start' } as const;
}
