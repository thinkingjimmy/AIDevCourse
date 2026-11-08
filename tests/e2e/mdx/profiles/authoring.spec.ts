import { test, expect } from '@playwright/test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('X profile authoring validates identity, local avatars, and card groups', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'Content validation is independent of the browser.');
  test.setTimeout(60000);
  const profile = '<XProfile username="karpathy" name="Andrej Karpathy" avatar="/images/profiles/x/karpathy.jpg" bio="AI education and practical examples." />';
  const group = (content: string) => `<XProfiles>\n${content}\n</XProfiles>`;
  const examples = [
    { body: profile, error: '' },
    { body: group(`${profile}\n${profile}`), error: '' },
    ...['username', 'name', 'avatar', 'bio'].map(field => ({ body: profile.replace(new RegExp(` ${field}="[^"]*"`), ''), error: `XProfile requires a nonempty ${field}` })),
    { body: profile.replace('name="Andrej Karpathy"', 'name=" "'), error: 'XProfile requires a nonempty name' },
    ...['@karpathy', '../karpathy', 'account-name', 'javascript:alert(1)', 'a'.repeat(16)].map(username => ({ body: profile.replace('username="karpathy"', `username="${username}"`), error: 'XProfile username must contain 1–15 letters, numbers, or underscores' })),
    { body: profile.replace('/images/profiles/x/karpathy.jpg', 'https://example.com/avatar.jpg'), error: 'Unsafe or unsupported URL' },
    { body: profile.replace('karpathy.jpg', 'missing-profile.jpg'), error: 'Missing or invalid image' },
    { body: `Text ${profile} inline.`, error: 'XProfile must be a standalone block' },
    { body: profile.replace(' />', '>\nHidden text\n</XProfile>'), error: 'XProfile does not accept children' },
    { body: profile.replace(' />', ' target="_self" />'), error: 'Unsupported attribute on XProfile' },
    { body: profile.replace(' />', ' username="another" />'), error: 'Duplicate attribute username' },
    { body: profile.replace('username="karpathy"', 'username={"karpathy"}'), error: 'use static strings' },
    { body: '<XProfiles />', error: 'XProfiles requires at least one XProfile' },
    { body: group('Unlinked text'), error: 'XProfiles accepts only direct XProfile children' },
    { body: group(group(profile)), error: 'XProfiles accepts only direct XProfile children' },
    { body: group(profile).replace('<XProfiles>', '<XProfiles title="People">'), error: 'XProfiles does not accept attributes' },
  ];
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-x-profiles-'));
  try {
    cpSync('tests/fixtures', join(root, 'tests/fixtures'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'tests/fixtures/en/ai-coding/foundations/first-change.mdx');
    const original = readFileSync(file, 'utf8');
    const evidence = [];
    for (const example of examples) {
      writeFileSync(file, `${original}\n\n${example.body}\n`);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/content/check.ts')], {
        cwd: root, env: { ...process.env, CONTENT_TEST: '1' }, encoding: 'utf8', timeout: 15000,
      });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      expect(result.error).toBeUndefined();
      expect(result.status === 0, output).toBe(!example.error);
      if (example.error) expect(output).toContain(example.error);
      evidence.push({ ...example, status: result.status, output });
    }
    await test.info().attach('X profile authoring', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
