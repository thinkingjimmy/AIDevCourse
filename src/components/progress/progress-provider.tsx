/**
 * [INPUT]: A course manifest, MDX-derived achievement inventory, and the guarded learning-record adapter.
 * [OUTPUT]: Hydration-safe LearningProvider/useLearning with achievement unlocks, visits, and tab synchronization.
 * [POS]: Course client boundary; article content remains server rendered and visits never imply an achievement.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LearningStorage, coursePrefix, type LearningState } from '@/lib/progress';
import type { CourseManifest } from '@/lib/content/model';

type Context = {
  course: CourseManifest; learning: LearningState; ready: boolean;
  unlock: (id: string) => boolean; visit: (id: string) => void;
};
const LearningContext = createContext<Context | null>(null);

export function LearningProvider({ course, children }: { course: CourseManifest; children: ReactNode }) {
  const storage = useMemo(() => new LearningStorage(() => window.localStorage, course.id, course.achievements.map((item) => item.id)), [course.id, course.achievements]);
  const [learning, setLearning] = useState<LearningState>({ unlocked: {}, failed: false });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const read = () => { setLearning(storage.load()); setReady(true); };
    const sync = (event: StorageEvent) => { if (event.key === null || event.key.startsWith(coursePrefix(course.id))) read(); };
    read();
    window.addEventListener('storage', sync);
    window.addEventListener('focus', read);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('focus', read); };
  }, [course.id, storage]);
  const unlock = useCallback((id: string) => {
    if (!ready || !course.achievements.some((achievement) => achievement.id === id)) return false;
    setLearning(storage.unlock(id));
    return true;
  }, [ready, course, storage]);
  const visit = useCallback((id: string) => {
    if (ready && course.lessons.some((lesson) => lesson.id === id)) setLearning(storage.visit(id));
  }, [ready, course, storage]);
  const value = useMemo(() => ({ course, learning, ready, unlock, visit }), [course, learning, ready, unlock, visit]);
  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) throw new Error('Learning controls require LearningProvider');
  return context;
}
