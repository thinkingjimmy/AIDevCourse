/**
 * [INPUT]: One course's manifest and the guarded browser storage adapter.
 * [OUTPUT]: Hydration-safe progress context, explicit actions, tab sync, and per-lesson display states.
 * [POS]: Small client boundary around course controls; article content stays server rendered.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ProgressStorage, coursePrefix, type Progress } from '@/lib/progress/storage';
import { selectProgress } from '@/lib/progress/selectors';
import type { CourseManifest, LessonSummary } from '@/lib/content/types';
type Context = {
  course: CourseManifest; progress: Progress; ready: boolean;
  complete: (id: string, value: boolean) => void; visit: (id: string) => void; reset: () => void;
};
const ProgressContext = createContext<Context | null>(null);
export function ProgressProvider({ course, children }: { course: CourseManifest; children: ReactNode }) {
  const [storage] = useState(() => new ProgressStorage(() => window.localStorage));
  const [progress, setProgress] = useState<Progress>({ completed: {}, failed: false });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const read = () => { setProgress(storage.load(course.id)); setReady(true); };
    const sync = (event: StorageEvent) => { if (event.key === null || event.key.startsWith(coursePrefix(course.id))) read(); };
    read();
    window.addEventListener('storage', sync);
    window.addEventListener('focus', read);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('focus', read); };
  }, [course.id, storage]);
  const complete = useCallback((id: string, value: boolean) => {
    if (ready && course.lessons.some((lesson) => lesson.id === id)) setProgress(storage.complete(course.id, id, value));
  }, [ready, course, storage]);
  const visit = useCallback((id: string) => {
    if (ready && course.lessons.some((lesson) => lesson.id === id)) setProgress(storage.visit(course.id, id));
  }, [ready, course, storage]);
  const reset = useCallback(() => { if (ready) setProgress(storage.reset(course.id)); }, [ready, course.id, storage]);
  const value = useMemo(() => ({ course, progress, ready, complete, visit, reset }), [course, progress, ready, complete, visit, reset]);
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}
export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('Learning controls require ProgressProvider');
  return context;
}
export type LessonState = 'done' | 'current' | 'todo';
/** Server output and the first client render agree on 'todo'; restored progress then fills in real states. */
export function useLessonStates() {
  const { course, progress, ready } = useProgress();
  const summary = selectProgress(course.lessons, progress);
  const started = ready && summary.action === 'continue';
  const stateOf = (lesson: LessonSummary): LessonState => !ready ? 'todo'
    : progress.completed[lesson.id] ? 'done' : started && lesson.id === summary.next?.id ? 'current' : 'todo';
  return { stateOf, summary, ready, lastId: ready ? progress.last : undefined };
}
