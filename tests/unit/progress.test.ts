/**
 * [INPUT]: In-memory storage with failure injection and language-local manifests.
 * [OUTPUT]: Stable identity, migration safety, reset isolation, and fallback coverage.
 * [POS]: Learning-record policy tests; no browser or UI implementation details required.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { describe, expect, it } from 'vitest';
import { ProgressStorage, type StorageLike } from '../../src/lib/progress/storage';
import { selectProgress } from '../../src/lib/progress/selectors';
import type { LessonSummary } from '../../src/lib/content/types';
class MemoryStorage implements StorageLike {
  data = new Map<string, string>(); writes = 0; denied = false;
  get length() { return this.data.size; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.denied) throw new Error('Quota exceeded'); this.data.set(key, value); this.writes++; }
  removeItem(key: string) { if (this.denied) throw new Error('Storage disabled'); this.data.delete(key); }
}
function lessons(ids: string[], locale = 'zh'): LessonSummary[] { return ids.map((id) => ({ id, title: id, url: `/${locale}/courses/course/${id}`, description: id, durationMinutes: 5, type: 'concept', module: 'module', moduleTitle: 'Module' })); }
describe('progress persistence', () => {
  it('restores before writing and shares stable completion across languages', () => {
    const storage = new MemoryStorage(); const adapter = new ProgressStorage(() => storage);
    adapter.complete('course', 'one', true); const writes = storage.writes;
    const restored = new ProgressStorage(() => storage).load('course');
    expect(storage.writes).toBe(writes);
    expect(selectProgress(lessons(['one', 'two']), restored).percent).toBe(50);
    expect(selectProgress(lessons(['one'], 'fr'), restored).percent).toBe(100);
    expect([...storage.data.keys()]).toEqual(['lac:v1:course:lesson:one']);
  });
  it('retains other courses and preferences when resetting old and current lessons', () => {
    const storage = new MemoryStorage(); const adapter = new ProgressStorage(() => storage);
    adapter.complete('course', 'old-lesson', true); adapter.visit('course', 'old-lesson');
    adapter.complete('other', 'one', true); storage.setItem('language', 'fr');
    adapter.reset('course');
    expect(adapter.load('course').completed).toEqual({});
    expect(adapter.load('other').completed.one).toBe(true); expect(storage.getItem('language')).toBe('fr');
  });
  it.each(['{broken', '{"completed":"yes","updatedAt":"now"}', '{"completed":true,"updatedAt":"2026-09-23T00:00:00Z","future":1}'])('protects unknown/corrupt saved data %s', (raw) => {
    const storage = new MemoryStorage(); storage.setItem('lac:v1:course:lesson:one', raw);
    const adapter = new ProgressStorage(() => storage); expect(adapter.load('course').failed).toBe(true);
    adapter.complete('course', 'one', true); expect(storage.getItem('lac:v1:course:lesson:one')).toBe(raw);
    expect(adapter.load('course').completed.one).toBe(true);
  });
  it('degrades to memory when reading or writing storage fails', () => {
    const unavailable = new ProgressStorage(() => { throw new Error('Blocked'); });
    expect(unavailable.complete('course', 'one', true)).toEqual({ completed: { one: true }, last: undefined, failed: true });
    const storage = new MemoryStorage(); storage.denied = true;
    const adapter = new ProgressStorage(() => storage); adapter.complete('course', 'one', true);
    expect(adapter.load('course').completed.one).toBe(true); expect(adapter.load('course').failed).toBe(true);
  });
  it('does not mark a lesson complete when visiting, and undo preserves recent position', () => {
    const adapter = new ProgressStorage(() => new MemoryStorage());
    const storage = new MemoryStorage(); const persistent = new ProgressStorage(() => storage);
    expect(adapter.visit('course', 'one').completed).toEqual({});
    persistent.visit('course', 'one'); persistent.complete('course', 'one', true); persistent.complete('course', 'one', false);
    expect(persistent.load('course').last).toBe('one'); expect(persistent.load('course').completed.one).toBe(false);
  });
  it('observes successful external writes and course resets without writing back', () => {
    const storage = new MemoryStorage(); const first = new ProgressStorage(() => storage); const second = new ProgressStorage(() => storage);
    first.complete('course', 'one', true); expect(second.load('course').completed.one).toBe(true);
    second.reset('course'); const writes = storage.writes;
    expect(first.load('course').completed).toEqual({}); expect(storage.writes).toBe(writes);
  });
});
describe('current-language continuation', () => {
  it('handles new readers, missing translations, completed visits, and full review', () => {
    const list = lessons(['one', 'two'], 'fr');
    expect(selectProgress(list, { completed: {}, failed: false }).next.id).toBe('one');
    expect(selectProgress(list, { completed: {}, last: 'two', failed: false }).next.id).toBe('two');
    expect(selectProgress(list, { completed: { one: true }, last: 'missing', failed: false }).next.id).toBe('two');
    expect(selectProgress(list, { completed: { one: true, two: true }, last: 'two', failed: false }).action).toBe('review');
  });
  it('keeps ID-based progress after titles, paths, order, and language coverage change', () => {
    const progress = { completed: { one: true, deleted: true }, last: 'deleted', failed: false };
    const changed = lessons(['two', 'one'], 'es').map((lesson) => ({ ...lesson, title: 'New title', url: `${lesson.url}-renamed` }));
    expect(selectProgress(changed, progress)).toMatchObject({ total: 2, done: 1, next: { id: 'two' } });
    expect(selectProgress([], progress)).toMatchObject({ total: 0, percent: 0, allDone: false, next: undefined });
  });
});
