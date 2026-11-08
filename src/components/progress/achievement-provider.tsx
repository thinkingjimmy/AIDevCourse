'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LearningStorage, areLessonsComplete, coursePrefix, type LearningState } from '@/lib/progress';
import type { AchievementCourse } from '@/lib/content/model';

type Context = {
  courses: AchievementCourse[]; learning: Record<string, LearningState>; ready: boolean;
  unlock: (courseId: string, achievementId: string) => boolean;
  complete: (courseId: string, lessonId: string) => boolean;
  visit: (courseId: string, lessonId: string) => void;
};
const AchievementContext = createContext<Context | null>(null);

function reconcileCompletion(course: AchievementCourse, storage: LearningStorage, learning = storage.load()) {
  const achievement = course.achievements.find((item) => item.kind === 'course-completion');
  if (achievement && !Object.hasOwn(learning.unlocked, achievement.id) && areLessonsComplete(course.lessonIds, learning.completed)) {
    return storage.unlock(achievement.id);
  }
  return learning;
}

export function AchievementProvider({ courses, children }: { courses: AchievementCourse[]; children: ReactNode }) {
  const stores = useMemo(() => new Map(courses.map((course) => [course.id, {
    course,
    storage: new LearningStorage(() => window.localStorage, course.id, course.achievements.map((item) => item.id), course.lessonIds),
  }])), [courses]);
  const [learning, setLearning] = useState<Record<string, LearningState>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => {
      setLearning(Object.fromEntries([...stores].map(([id, { course, storage }]) => [id, reconcileCompletion(course, storage)])));
      setReady(true);
    };
    const sync = (event: StorageEvent) => {
      const key = event.key;
      if (key === null || [...stores.keys()].some((id) => key.startsWith(coursePrefix(id)))) read();
    };
    read();
    window.addEventListener('storage', sync);
    window.addEventListener('focus', read);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('focus', read); };
  }, [stores]);

  const unlock = useCallback((courseId: string, achievementId: string) => {
    const entry = stores.get(courseId);
    if (!ready || !entry || !entry.course.achievements.some((item) => item.kind === 'exercise' && item.id === achievementId)) return false;
    const next = reconcileCompletion(entry.course, entry.storage, entry.storage.unlock(achievementId));
    setLearning((current) => ({ ...current, [courseId]: next }));
    return true;
  }, [ready, stores]);

  const visit = useCallback((courseId: string, lessonId: string) => {
    const entry = stores.get(courseId);
    if (!ready || !entry) return;
    const next = reconcileCompletion(entry.course, entry.storage, entry.storage.visit(lessonId));
    setLearning((current) => ({ ...current, [courseId]: next }));
  }, [ready, stores]);

  const complete = useCallback((courseId: string, lessonId: string) => {
    const entry = stores.get(courseId);
    if (!ready || !entry || !entry.course.lessonIds.includes(lessonId)) return false;
    const next = reconcileCompletion(entry.course, entry.storage, entry.storage.complete(lessonId));
    setLearning((current) => ({ ...current, [courseId]: next }));
    return true;
  }, [ready, stores]);

  const value = useMemo(() => ({ courses, learning, ready, unlock, visit, complete }), [courses, learning, ready, unlock, visit, complete]);
  return <AchievementContext value={value}>{children}</AchievementContext>;
}

export function useAchievements() {
  const context = useContext(AchievementContext);
  if (!context) throw new Error('Achievement controls require AchievementProvider');
  return context;
}
