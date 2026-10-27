/**
 * [INPUT]: Browser storage, stable IDs, and current-language lesson summaries.
 * [OUTPUT]: ProgressStorage persistence, coursePrefix, progress models, and selectProgress.
 * [POS]: Sole persistence adapter; corrupt records are protected until reset.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { LessonSummary } from './content/model';

export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export type Completion = { completed: boolean; updatedAt: string };
export type LastVisit = { lessonId: string; visitedAt: string };
export type Progress = { completed: Record<string, boolean>; last?: string; failed: boolean };
const validId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const validDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
export const coursePrefix = (courseId: string) => {
  if (!validId.test(courseId)) throw new Error('Invalid course identity');
  return `lac:v1:${courseId}:`;
};
export class ProgressStorage {
  private memory = new Map<string, string>();
  private protectedKeys = new Set<string>();
  private failed = false;
  constructor(private access: () => StorageLike) {}
  private read(key: string): unknown {
    let raw: string | null;
    try { raw = this.memory.get(key) ?? this.access().getItem(key); }
    catch { this.failed = true; raw = this.memory.get(key) ?? null; }
    if (raw === null) return undefined;
    try { return JSON.parse(raw); }
    catch { this.protectedKeys.add(key); this.failed = true; return undefined; }
  }
  private keys(prefix: string) {
    const keys = new Set([...this.memory.keys()].filter((key) => key.startsWith(prefix)));
    try {
      const storage = this.access();
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(prefix)) keys.add(key);
      }
    } catch { this.failed = true; }
    return [...keys];
  }
  load(courseId: string): Progress {
    const prefix = coursePrefix(courseId);
    const completed: Record<string, boolean> = {};
    let last: string | undefined;
    for (const key of this.keys(prefix)) {
      const value = this.read(key);
      if (value === undefined) continue;
      const object = value as Record<string, unknown> | null;
      const suffix = key.slice(prefix.length);
      if (object && typeof object === 'object' && !Array.isArray(object)) {
        if (suffix === 'last' && typeof object.lessonId === 'string' && validId.test(object.lessonId) && validDate(object.visitedAt) && Object.keys(object).length === 2) {
          last = object.lessonId; continue;
        }
        if (suffix.startsWith('lesson:') && validId.test(suffix.slice(7)) && typeof object.completed === 'boolean' && validDate(object.updatedAt) && Object.keys(object).length === 2) {
          completed[suffix.slice(7)] = object.completed; continue;
        }
      }
      this.protectedKeys.add(key);
      this.failed = true;
    }
    return { completed, last, failed: this.failed };
  }
  private write(key: string, value: Completion | LastVisit) {
    const raw = JSON.stringify(value);
    this.memory.set(key, raw);
    if (this.protectedKeys.has(key)) { this.failed = true; return; }
    try { this.access().setItem(key, raw); this.memory.delete(key); }
    catch { this.failed = true; }
  }
  complete(courseId: string, lessonId: string, completed: boolean) {
    if (!validId.test(lessonId)) throw new Error('Invalid lesson identity');
    this.write(`${coursePrefix(courseId)}lesson:${lessonId}`, { completed, updatedAt: new Date().toISOString() });
    return this.load(courseId);
  }
  visit(courseId: string, lessonId: string) {
    if (!validId.test(lessonId)) throw new Error('Invalid lesson identity');
    this.write(`${coursePrefix(courseId)}last`, { lessonId, visitedAt: new Date().toISOString() });
    return this.load(courseId);
  }
  reset(courseId: string) {
    for (const key of this.keys(coursePrefix(courseId))) {
      this.memory.delete(key);
      this.protectedKeys.delete(key);
      try { this.access().removeItem(key); }
      catch { this.failed = true; this.memory.set(key, 'null'); }
    }
    // Failed removals remain hidden for this session while the warning stays visible.
    return { completed: {}, failed: this.failed } satisfies Progress;
  }
}

export function selectProgress(lessons: LessonSummary[], progress: Progress) {
  const done = lessons.filter((lesson) => progress.completed[lesson.id]).length;
  const total = lessons.length;
  const allDone = total > 0 && done === total;
  const recent = lessons.find((lesson) => lesson.id === progress.last && !progress.completed[lesson.id]);
  const next = recent ?? lessons.find((lesson) => !progress.completed[lesson.id]) ?? lessons[0];
  return { done, total, allDone, percent: total ? Math.round(done / total * 100) : 0, next,
    action: allDone ? 'review' : progress.last || done ? 'continue' : 'start' } as const;
}
