'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LearningStorage, coursePrefix, type LearningState } from '@/lib/progress';
import type { AchievementCourse } from '@/lib/content/model';

type Context = {
  courses: AchievementCourse[]; learning: Record<string, LearningState>; ready: boolean;
  unlock: (courseId: string, achievementId: string) => boolean;
  visit: (courseId: string, lessonId: string) => void;
};
const AchievementContext = createContext<Context | null>(null);

export function AchievementProvider({ courses, children }: { courses: AchievementCourse[]; children: ReactNode }) {
  const stores = useMemo(() => new Map(courses.map((course) => [course.id,
    new LearningStorage(() => window.localStorage, course.id, course.achievements.map((item) => item.id)),
  ])), [courses]);
  const [learning, setLearning] = useState<Record<string, LearningState>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => {
      setLearning(Object.fromEntries([...stores].map(([id, storage]) => [id, storage.load()])));
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
    const storage = stores.get(courseId);
    if (!ready || !storage || !courses.some((course) => course.id === courseId && course.achievements.some((item) => item.id === achievementId))) return false;
    const next = storage.unlock(achievementId);
    setLearning((current) => ({ ...current, [courseId]: next }));
    return true;
  }, [courses, ready, stores]);

  const visit = useCallback((courseId: string, lessonId: string) => {
    const storage = stores.get(courseId);
    if (!ready || !storage) return;
    const next = storage.visit(lessonId);
    setLearning((current) => ({ ...current, [courseId]: next }));
  }, [ready, stores]);

  const value = useMemo(() => ({ courses, learning, ready, unlock, visit }), [courses, learning, ready, unlock, visit]);
  return <AchievementContext value={value}>{children}</AchievementContext>;
}

export function useAchievements() {
  const context = useContext(AchievementContext);
  if (!context) throw new Error('Achievement controls require AchievementProvider');
  return context;
}
