import { test, expect } from '@playwright/test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('code folding validates ranges before compiling a lesson', async ({ browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'Content validation is independent of the browser.');
  test.setTimeout(60000);
  const source = '// Setup\nconst first = 1;\nconst second = 2;\n\n// Result\nconsole.log(first + second);';
  const examples = [
    { meta: '', error: '' },
    { meta: 'fold="1-3"', error: '' },
    { meta: 'fold="1-3, 5-6"', error: '' },
    { meta: 'title="A fold example" fold="1-3"', error: '' },
    { meta: 'title="Example fold=invalid"', error: '' },
    ...['fold', 'fold=""', 'fold="1"', 'fold="first-third"', 'fold={1-3}', 'fold="1-3,"'].map(meta => ({ meta, error: 'Use fold="start-end"' })),
    ...['fold="0-3"', 'fold="3-3"', 'fold="4-2"', 'fold="1-7"'].map(meta => ({ meta, error: 'Fold ranges must contain a title line and at least one following line within the code block' })),
    ...['fold="1-3,3-6"', 'fold="5-6,1-3"'].map(meta => ({ meta, error: 'Fold ranges must be ordered and must not overlap' })),
    { meta: 'fold="1-3" fold="5-6"', error: 'Use only one fold attribute' },
    { meta: 'fold="4-6"', error: 'A fold title line must not be blank' },
  ];
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-code-folds-'));
  const evidence = [];
  try {
    cpSync('tests/fixtures', join(root, 'tests/fixtures'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'tests/fixtures/en/ai-coding/foundations/first-change.mdx');
    const original = readFileSync(file, 'utf8');
    for (const example of examples) {
      writeFileSync(file, `${original}\n\n\`\`\`ts ${example.meta}\n${source}\n\`\`\`\n`);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/content/check.ts')], {
        cwd: root, env: { ...process.env, CONTENT_TEST: '1' }, encoding: 'utf8', timeout: 15000,
      });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      evidence.push({ ...example, status: result.status, output });
      expect(result.error).toBeUndefined();
      expect(result.status === 0, output).toBe(!example.error);
      if (example.error) expect(output).toContain(example.error);
    }
    await testInfo.attach('Code fold authoring', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
