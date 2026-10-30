'use client';
import { useEffect } from 'react';
import { useLearning } from './progress-provider';

export function LessonVisit({ lessonId }: { lessonId: string }) {
  const { ready, visit } = useLearning();
  useEffect(() => { if (ready) visit(lessonId); }, [ready, visit, lessonId]);
  return null;
}
