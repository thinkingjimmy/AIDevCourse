/**
 * [INPUT]: Five-language courses in tests/fixtures/ and temporary authoring mutations.
 * [OUTPUT]: Publication, identity, ordering, revision, and unsafe-content regression coverage.
 * [POS]: Content-policy tests independent of compiled framework caches.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCatalog } from '../../src/lib/content/manifest';
import { inspectMarkdown } from '../../src/lib/content/mdx';
import { documentSchema } from '../../src/lib/content/schema';
const temporary: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'lac-content-'));
  temporary.push(root); cpSync('tests/fixtures', root, { recursive: true }); return root;
}
function edit(root: string, path: string, transform: (value: string) => string) {
  const file = join(root, path); writeFileSync(file, transform(readFileSync(file, 'utf8')));
}
const first = 'ai-coding/foundations/first-change.mdx';
afterEach(() => { for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true }); });
describe('publication catalog', () => {
  it('keeps five translations of a stable identity and language-local totals', () => {
    const catalog = readCatalog({ root: fixture() });
    expect(catalog.translations['ai-coding:first-change']).toHaveLength(5);
    expect(catalog.courses.find((course) => course.locale === 'zh')?.lessons).toHaveLength(3);
    expect(catalog.courses.find((course) => course.locale === 'en')?.lessons).toHaveLength(2);
    expect(catalog.documents.some((doc) => doc.body.includes('WITHDRAWN_SECRET') || doc.body.includes('DRAFT_TRANSLATION_SECRET'))).toBe(false);
    expect(catalog.warnings.length).toBeGreaterThan(0);
  });
  it('rejects a course with no lessons', () => {
    const root = fixture();
    rmSync(join(root, `ja/${first}`));
    edit(root, 'ja/ai-coding/foundations/meta.json', (value) => value.replace(/\s*"first-change",?/, ''));
    expect(() => readCatalog({ root })).toThrow('at least one');
  });
  it.each([
    ['duplicate identity', 'zh/ai-coding/foundations/useful-context.mdx', (v: string) => v.replace('lessonId: useful-context', 'lessonId: first-change'), 'Duplicate identity'],
    ['translation mismatch', `fr/${first}`, (v: string) => v.replace('lessonId: first-change', 'lessonId: missing-original'), 'Missing original'],
    ['future revision', `es/${first}`, (v: string) => v.replace('translatedFromRevision: 1', 'translatedFromRevision: 3'), 'future revision'],
    ['wrong ownership', `en/${first}`, (v: string) => v.replace('courseId: ai-coding', 'courseId: another-course'), 'ownership'],
    ['unknown component', `zh/${first}`, (v: string) => `${v}\n<Quiz />\n`, 'Unknown component'],
    ['script', `zh/${first}`, (v: string) => `${v}\n<script>alert(1)</script>\n`, 'Unknown component'],
    ['MDX expression', `zh/${first}`, (v: string) => `${v}\n{process.env.SECRET}\n`, 'expressions'],
    ['broken anchor', `zh/${first}`, (v: string) => `${v}\n[Missing](#missing-anchor)\n`, 'Missing heading'],
    ['missing link', `zh/${first}`, (v: string) => `${v}\n[Missing lesson](/en/courses/ai-coding/foundations/verify-results)\n`, 'missing'],
    ['missing image', `zh/${first}`, (v: string) => `${v}\n![Alt](/images/missing.png)\n`, 'Missing or invalid image'],
    ['dangerous link', `zh/${first}`, (v: string) => `${v}\n[Bad](javascript:alert)\n`, 'Unsafe'],
  ])('rejects %s', (_name, path, transform, message) => {
    const root = fixture(); edit(root, path, transform);
    expect(() => readCatalog({ root })).toThrow(message);
  });
  it('rejects duplicate extensions and directory omissions', () => {
    const root = fixture(); cpSync(join(root, `zh/${first}`), join(root, `zh/${first.replace('.mdx', '.md')}`));
    expect(() => readCatalog({ root })).toThrow('duplicate .md/.mdx');
  });
  it('rejects reversed translation order', () => {
    const root = fixture(); edit(root, 'en/ai-coding/foundations/meta.json', (v) => v.replace('"first-change",\n    "useful-context"', '"useful-context",\n    "first-change"'));
    expect(() => readCatalog({ root })).toThrow('subsequence');
  });
  it('rejects omitted public lessons', () => {
    const root = fixture(); edit(root, 'zh/ai-coding/foundations/meta.json', (v) => v.replace('    "first-change",\n', ''));
    expect(() => readCatalog({ root })).toThrow('missing from explicit');
  });
  it('rejects stale directory entries', () => {
    const root = fixture(); edit(root, 'ja/ai-coding/foundations/meta.json', (v) => v.replace('"first-change"', '"missing-file"'));
    expect(() => readCatalog({ root })).toThrow('missing directory entry');
  });
  it('does not treat JSX in fenced examples as executable components', () => {
    expect(() => inspectMarkdown('```tsx\n<Quiz onClick={() => eval("x")} />\n```', 'example.mdx')).not.toThrow();
  });
  it('validates real dates, rejects a review flag, and requires tool verification', () => {
    const base = { kind: 'lesson', courseId: 'course', lessonId: 'lesson', title: 'Title', description: 'Description', durationMinutes: 5, lessonType: 'tool', contentRevision: 1 };
    expect(documentSchema.safeParse(base).success).toBe(false);
    expect(documentSchema.safeParse({ ...base, lastVerified: '2026-02-30', testedWith: 'Local browser' }).success).toBe(false);
    expect(documentSchema.safeParse({ ...base, lastVerified: '2026-09-23', testedWith: 'Local browser' }).success).toBe(true);
    expect(documentSchema.safeParse({ ...base, lastVerified: '2026-09-23', testedWith: 'Local browser', draft: false }).success).toBe(false);
  });
});
