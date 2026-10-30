import { test, expect } from '@playwright/test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('chat sequence accepts only standalone parameterless authoring', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'Content validation is independent of the browser.');
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-chat-sequence-'));
  try {
    cpSync('tests/fixtures', join(root, 'content'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'content/en/ai-coding/foundations/first-change.mdx');
    const original = readFileSync(file, 'utf8');
    const evidence = [];
    for (const example of [
      { body: '\n<ChatMessageSequence />\n', valid: true, error: '' },
      { body: '\n<ChatMessageSequence title="Example" />\n', valid: false, error: 'does not accept attributes' },
      { body: '\nText <ChatMessageSequence /> inline.\n', valid: false, error: 'must be a standalone block' },
      { body: '\n<ChatMessageSequence>\nHidden text\n</ChatMessageSequence>\n', valid: false, error: 'does not accept children' },
    ]) {
      writeFileSync(file, original + example.body);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/check-content.ts')], { cwd: root, env: { ...process.env, CONTENT_TEST: '0' }, encoding: 'utf8', timeout: 15000 });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      expect(result.error).toBeUndefined();
      expect(result.status === 0, output).toBe(example.valid);
      if (example.error) expect(output).toContain(example.error);
      evidence.push({ ...example, status: result.status, output });
    }
    await test.info().attach('chat-sequence-authoring', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
