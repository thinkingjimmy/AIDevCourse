import { test, expect } from '@playwright/test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('embed authoring validates URLs, placement, and static attributes', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'Content validation is independent of the browser.');
  test.setTimeout(120000);
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-embeds-'));
  const evidence = [];
  try {
    cpSync('tests/fixtures', join(root, 'content'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'content/en/ai-coding/foundations/first-change.mdx');
    const original = readFileSync(file, 'utf8');
    const valid = [
      '<XEmbed url="https://x.com/TwitterDev/status/560070183650213889" />',
      '<XEmbed url="https://twitter.com/TwitterDev/status/560070183650213889?s=20" title="A public post" />',
      '<XEmbed url="https://mobile.twitter.com/TwitterDev/status/560070183650213889/photo/1" />',
      '<XEmbed url="https://x.com/i/web/status/560070183650213889" />',
      '<XEmbed url="https://x.com/i/status/560070183650213889" />',
      '<YouTube url="https://www.youtube.com/watch?v=M7lc1UVf-VE" />',
      '<YouTube url="https://youtu.be/M7lc1UVf-VE?t=1m30s" title="Player demonstration" />',
      '<YouTube url="https://m.youtube.com/shorts/M7lc1UVf-VE" />',
      '<YouTube url="https://www.youtube.com/embed/M7lc1UVf-VE?start=90" />',
      '<YouTube url="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE" />',
      '<YouTube url="https://youtube.com/watch?v=M7lc1UVf-VE#t=90" />',
      '<YouTube url="https://youtube.com/watch?v=M7lc1UVf-VE&amp;t=90" />',
      '```mdx\n<YouTube url="invalid" />\n<XEmbed />\n```',
    ];
    const invalid: [string, string][] = [
      ['<XEmbed />', 'valid HTTPS X post URL'],
      ['<YouTube />', 'valid HTTPS YouTube video URL'],
      ['<XEmbed url="https://x.com/TwitterDev" />', 'valid HTTPS X post URL'],
      ['<XEmbed url="https://x.com/TwitterDev/status/not-an-id" />', 'valid HTTPS X post URL'],
      ['<XEmbed url="https://x.com/TwitterDev/status/0" />', 'valid HTTPS X post URL'],
      ['<XEmbed url="http://x.com/TwitterDev/status/560070183650213889" />', 'valid HTTPS X post URL'],
      ['<XEmbed url="https://x.com.evil.example/TwitterDev/status/560070183650213889" />', 'valid HTTPS X post URL'],
      ['<XEmbed url="https://x.com@evil.example/TwitterDev/status/560070183650213889" />', 'valid HTTPS X post URL'],
      ['<XEmbed url="https://user:password@x.com/TwitterDev/status/560070183650213889" />', 'valid HTTPS X post URL'],
      ['<XEmbed url="https://x.com:8443/TwitterDev/status/560070183650213889" />', 'valid HTTPS X post URL'],
      ['<YouTube url="https://youtube.com/playlist?list=PL123" />', 'valid HTTPS YouTube video URL'],
      ['<YouTube url="https://youtu.be/invalid" />', 'valid HTTPS YouTube video URL'],
      ['<YouTube url="http://youtube.com/watch?v=M7lc1UVf-VE" />', 'valid HTTPS YouTube video URL'],
      ['<YouTube url="https://youtube.com.evil.example/watch?v=M7lc1UVf-VE" />', 'valid HTTPS YouTube video URL'],
      ['<YouTube url="https://user@youtube.com/watch?v=M7lc1UVf-VE" />', 'valid HTTPS YouTube video URL'],
      ['<YouTube url="https://youtube.com:8443/watch?v=M7lc1UVf-VE" />', 'valid HTTPS YouTube video URL'],
      ['<YouTube url="javascript:alert(1)" />', 'valid HTTPS YouTube video URL'],
      ['<YouTube url="//youtube.com/watch?v=M7lc1UVf-VE" />', 'valid HTTPS YouTube video URL'],
      ['<YouTube url="https://youtu.be/M7lc1UVf-VE?t=-1" />', 'valid HTTPS YouTube video URL'],
      ['<YouTube url="https://youtu.be/M7lc1UVf-VE?t=invalid" />', 'valid HTTPS YouTube video URL'],
      ['<YouTube url="https://youtu.be/M7lc1UVf-VE?t=99999999999999999999" />', 'valid HTTPS YouTube video URL'],
      ['<XEmbed url="https://youtu.be/M7lc1UVf-VE" />', 'valid HTTPS X post URL'],
      ['<YouTube url="https://x.com/i/status/560070183650213889" />', 'valid HTTPS YouTube video URL'],
    ];
    for (const name of ['XEmbed', 'YouTube']) {
      const url = name === 'XEmbed' ? 'https://x.com/i/status/560070183650213889' : 'https://youtu.be/M7lc1UVf-VE';
      invalid.push(
        [`Text <${name} url="${url}" /> inline.`, 'must be a standalone block'],
        [`<${name} url="${url}">\nHidden content\n</${name}>`, 'does not accept children'],
        [`<${name} url="${url}" autoplay="true" />`, 'Unsupported attribute'],
        [`<${name} url="${url}" url="${url}" />`, 'Duplicate attribute'],
        [`<${name} url="${url}" title=" " />`, 'title must not be empty'],
        [`<${name} url={"${url}"} />`, 'use static'],
        [`<${name} {...props} />`, 'use static'],
      );
    }
    invalid.push(['<iframe src="https://www.youtube.com/embed/M7lc1UVf-VE" />', 'Unknown component']);
    invalid.push(['<script src="https://platform.twitter.com/widgets.js" />', 'Unknown component']);
    for (const example of [...valid.map((body) => ({ body, valid: true, error: '' })), ...invalid.map(([body, error]) => ({ body, valid: false, error }))]) {
      writeFileSync(file, `${original}\n\n${example.body}\n`);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/check-content.ts')], {
        cwd: root, env: { ...process.env, CONTENT_TEST: '0' }, encoding: 'utf8', timeout: 15000,
      });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      evidence.push({ ...example, status: result.status, output, processError: result.error?.message });
    }
    await test.info().attach('embed-authoring', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    for (const item of evidence) {
      expect(item.processError, item.body).toBeUndefined();
      expect(item.status === 0, `${item.body}\n${item.output}`).toBe(item.valid);
      if (!item.valid) {
        expect(item.output).toContain(item.error);
        expect(item.output).toContain('first-change.mdx');
      }
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
