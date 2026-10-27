/**
 * [INPUT]: Browser storage, stable course/lesson identities, and the published course achievement inventory.
 * [OUTPUT]: LearningStorage, LearningState, and coursePrefix for registered course achievements.
 * [POS]: Sole learning-record adapter; keeps recent visits and earned achievements separate from legacy completion.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
export type LearningState = { unlocked: Record<string, string>; last?: string; failed: boolean };
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const validId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
export const coursePrefix = (courseId: string) => {
  if (!validId.test(courseId)) throw new Error('Invalid course identity');
  return `lac:v1:${courseId}:`;
};

export class LearningStorage {
  private memory = new Map<string, string>();
  private protectedKeys = new Set<string>();
  private failed = false;
  private prefix: string;
  private achievementIds: Set<string>;
  constructor(private access: () => StorageLike, courseId: string, achievementIds: readonly string[]) {
    this.prefix = coursePrefix(courseId);
    if (achievementIds.some((id) => !validId.test(id))) throw new Error('Invalid achievement identity');
    this.achievementIds = new Set(achievementIds);
  }

  private read(key: string): Record<string, unknown> | undefined {
    let raw: string | null;
    try { raw = this.memory.get(key) ?? this.access().getItem(key); }
    catch { this.failed = true; raw = this.memory.get(key) ?? null; }
    if (raw === null) return;
    try {
      const value: unknown = JSON.parse(raw);
      if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    } catch { /* Preserve damaged records while allowing this page to keep learning. */ }
    this.protect(key);
  }

  private protect(key: string) {
    this.protectedKeys.add(key);
    this.failed = true;
  }

  load(): LearningState {
    const prefix = this.prefix;
    const unlocked: Record<string, string> = {};
    const lastKey = `${prefix}last`;
    const visit = this.read(lastKey);
    let last: string | undefined;
    if (visit) {
      if (typeof visit.lessonId === 'string' && validId.test(visit.lessonId) && validDate(visit.visitedAt) && Object.keys(visit).length === 2) last = visit.lessonId;
      else this.protect(lastKey);
    }
    for (const id of this.achievementIds) {
      const key = `${prefix}achievement:${id}`;
      const record = this.read(key);
      if (record) {
        if (validDate(record.unlockedAt) && Object.keys(record).length === 1) unlocked[id] = record.unlockedAt;
        else this.protect(key);
      }
    }
    return { unlocked, last, failed: this.failed };
  }

  private write(key: string, value: object) {
    const raw = JSON.stringify(value);
    this.memory.set(key, raw);
    if (this.protectedKeys.has(key)) return;
    try { this.access().setItem(key, raw); this.memory.delete(key); }
    catch { this.failed = true; }
  }

  unlock(achievementId: string) {
    if (!this.achievementIds.has(achievementId)) throw new Error('Unknown achievement');
    const state = this.load();
    if (!Object.hasOwn(state.unlocked, achievementId)) this.write(`${this.prefix}achievement:${achievementId}`, { unlockedAt: new Date().toISOString() });
    return this.load();
  }

  visit(lessonId: string) {
    if (!validId.test(lessonId)) throw new Error('Invalid lesson identity');
    this.write(`${this.prefix}last`, { lessonId, visitedAt: new Date().toISOString() });
    return this.load();
  }
}
