/**
 * [INPUT]: Stable lesson identity and the restored learning context.
 * [OUTPUT]: LessonVisit, a renderless recent-visit recorder.
 * [POS]: Lesson route companion; records position independently of achievement interactions.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useEffect } from 'react';
import { useLearning } from './progress-provider';

export function LessonVisit({ lessonId }: { lessonId: string }) {
  const { ready, visit } = useLearning();
  useEffect(() => { if (ready) visit(lessonId); }, [ready, visit, lessonId]);
  return null;
}
