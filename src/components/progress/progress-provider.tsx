'use client';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { areLessonsComplete, type LearningState } from '@/lib/progress';
import type { CourseManifest } from '@/lib/content/model';
import { useAchievements } from './achievement-provider';

type Context = {
  course: CourseManifest; learning: LearningState; ready: boolean; courseCompleted: boolean;
  unlock: (id: string) => boolean; visit: (id: string) => void; complete: (id: string) => boolean;
};
const LearningContext = createContext<Context | null>(null);
const emptyLearning: LearningState = { unlocked: {}, completed: {}, failed: false };

export function LearningProvider({ course, children }: { course: CourseManifest; children: ReactNode }) {
  const { courses, learning: allLearning, ready, unlock: unlockAchievement, visit: visitLesson, complete: completeLesson } = useAchievements();
  const learning = Object.hasOwn(allLearning, course.id) ? allLearning[course.id] : emptyLearning;
  const courseCompleted = ready && areLessonsComplete(courses.find((item) => item.id === course.id)?.lessonIds ?? [], learning.completed);
  const unlock = useCallback((id: string) => {
    if (!ready || !course.achievements.some((achievement) => achievement.kind === 'exercise' && achievement.id === id)) return false;
    return unlockAchievement(course.id, id);
  }, [ready, course, unlockAchievement]);
  const visit = useCallback((id: string) => {
    if (ready && course.lessons.some((lesson) => lesson.id === id)) visitLesson(course.id, id);
  }, [ready, course, visitLesson]);
  const complete = useCallback((id: string) => {
    if (!ready || !course.lessons.some((lesson) => lesson.id === id)) return false;
    return completeLesson(course.id, id);
  }, [ready, course, completeLesson]);
  const value = useMemo(() => ({ course, learning, ready, courseCompleted, unlock, visit, complete }), [course, learning, ready, courseCompleted, unlock, visit, complete]);
  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) throw new Error('Learning controls require LearningProvider');
  return context;
}
