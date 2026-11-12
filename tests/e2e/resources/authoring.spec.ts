import { test, expect } from '@playwright/test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('resource disk authoring accepts ordered catalog IDs and rejects invalid MDX', async ({ browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'The authoring CLI has no browser-specific behavior.');
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-resource-authoring-'));
  try {
    mkdirSync(join(root, 'tests'));
    cpSync('tests/fixtures', join(root, 'tests/fixtures'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'tests/fixtures/en/ai-coding/foundations/first-change.mdx');
    const original = readFileSync(file, 'utf8');
    const examples = [
      { name: 'standalone resources', body: '\n<ResourceDisks />\n', valid: true },
      { name: 'selected course and dictionary', body: '\n<ResourceDisks items="ai-coding, vocabulary" />\n', valid: true },
      { name: 'multiple resource sections', body: '\n<ResourceDisks />\n\n<ResourceDisks items="vocabulary" />\n', valid: true },
      { name: 'literal example', body: '\n```mdx\n<ResourceDisks items="example" />\n```\n', valid: true },
      { name: 'inline resources', body: '\nRead <ResourceDisks /> here.\n', valid: false, error: 'must be a standalone block' },
      { name: 'unknown attribute', body: '\n<ResourceDisks title="Example" />\n', valid: false, error: 'Unsupported attribute' },
      { name: 'expression', body: '\n<ResourceDisks items={["ai-coding"]} />\n', valid: false, error: 'use static strings' },
      { name: 'empty item', body: '\n<ResourceDisks items="ai-coding, " />\n', valid: false, error: 'comma-separated list of IDs' },
      { name: 'duplicate item', body: '\n<ResourceDisks items="vocabulary, vocabulary" />\n', valid: false, error: 'duplicate IDs' },
      { name: 'unknown item', body: '\n<ResourceDisks items="missing-course" />\n', valid: false, error: 'Unknown ResourceDisks item for en: missing-course' },
      { name: 'custom children', body: '\n<ResourceDisks>\nCustom text\n</ResourceDisks>\n', valid: false, error: 'does not accept children' },
    ];
    const evidence = [];
    for (const example of examples) {
      writeFileSync(file, original + example.body);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/content/check.ts')], {
        cwd: root, env: { ...process.env, CONTENT_TEST: '1' }, encoding: 'utf8', timeout: 15000,
      });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      expect(result.error).toBeUndefined();
      expect(result.status === 0, output).toBe(example.valid);
      if (example.error) expect(output).toContain(example.error);
      evidence.push({ name: example.name, status: result.status, output });
    }
    await testInfo.attach('Resource disk authoring', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
