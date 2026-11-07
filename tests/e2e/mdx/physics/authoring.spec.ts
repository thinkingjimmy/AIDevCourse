import { test, expect } from '@playwright/test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test("Newton's second law accepts only standalone parameterless authoring", async ({ browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'Content validation is independent of the browser.');
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-newton-'));
  try {
    cpSync('tests/fixtures', join(root, 'tests/fixtures'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'tests/fixtures/en/ai-coding/foundations/first-change.mdx');
    const original = readFileSync(file, 'utf8');
    const evidence = [];
    for (const example of [
      { body: '\n<NewtonSecondLawDemo />\n', error: '' },
      { body: '\n<NewtonSecondLawDemo force="4" />\n', error: 'does not accept attributes' },
      { body: '\nText <NewtonSecondLawDemo /> inline.\n', error: 'must be a standalone block' },
      { body: '\n<NewtonSecondLawDemo>\nHidden text\n</NewtonSecondLawDemo>\n', error: 'does not accept children' },
    ]) {
      writeFileSync(file, original + example.body);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/content/check.ts')], { cwd: root, env: { ...process.env, CONTENT_TEST: '1' }, encoding: 'utf8', timeout: 15000 });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      expect(result.error).toBeUndefined();
      expect(result.status === 0, output).toBe(!example.error);
      if (example.error) expect(output).toContain(example.error);
      evidence.push({ ...example, status: result.status, output });
    }
    await testInfo.attach('newton-authoring', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
