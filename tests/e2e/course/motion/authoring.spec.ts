import { test, expect } from '@playwright/test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('animation authoring validates types and rejects malformed declarations', async ({ browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'Content validation is independent of the browser.');
  test.setTimeout(60000);
  const examples = [
    ...['stagger', 'spring', 'skeleton', 'count-up', 'typewriter', 'marquee'].map((type) => ({ body: `\n<AnimationDemo type="${type}" />\n`, error: '' })),
    { body: '\n<AnimationDemo />\n', error: 'requires one static type' },
    { body: '\n<AnimationDemo type="bounce" />\n', error: 'requires one static type' },
    { body: '\n<AnimationDemo type="spring" title="Extra" />\n', error: 'requires one static type' },
    { body: '\n<AnimationDemo type={"spring"} />\n', error: 'requires one static type' },
    { body: '\nText <AnimationDemo type="spring" /> inline.\n', error: 'must be a standalone block' },
    { body: '\n<AnimationDemo type="spring">\nHidden text\n</AnimationDemo>\n', error: 'does not accept children' },
  ];
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-motion-'));
  try {
    cpSync('content', join(root, 'content'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'content/zh/coding-101/additional-reading/animation-prompts.mdx');
    const original = readFileSync(file, 'utf8');
    const evidence = [];
    for (const example of examples) {
      writeFileSync(file, original + example.body);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/content/check.ts')], { cwd: root, env: { ...process.env, CONTENT_TEST: '0' }, encoding: 'utf8', timeout: 15000 });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      expect(result.error).toBeUndefined();
      expect(result.status === 0, output).toBe(!example.error);
      if (example.error) expect(output).toContain(example.error);
      evidence.push({ ...example, status: result.status, output });
    }
    await testInfo.attach('animation-authoring', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
