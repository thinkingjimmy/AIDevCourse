import { expect, test } from '@playwright/test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('website previews validate links, titles, and a single local screenshot', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'Content validation is independent of the browser.');
  test.setTimeout(90000);
  const image = '![Personal website homepage](/images/websites/jimmy-home.webp)';
  const block = (children: string) => `<WebsitePreview url="https://jimmywong.dev/en" title="Personal website">\n${children}\n</WebsitePreview>`;
  const valid = block(image);
  const examples = [
    { body: valid, error: '' },
    ...['url', 'title'].map(field => ({ body: valid.replace(new RegExp(` ${field}="[^"]*"`), ''), error: `WebsitePreview requires a nonempty ${field}` })),
    { body: valid.replace('title="Personal website"', 'title=" "'), error: 'WebsitePreview requires a nonempty title' },
    ...['http://example.com', '/en', '//example.com', 'javascript:alert(1)', 'https://user:password@example.com'].map(url => ({
      body: valid.replace('https://jimmywong.dev/en', url), error: 'WebsitePreview requires an absolute HTTPS URL without credentials',
    })),
    { body: valid.replace('title="Personal website"', 'title="Personal website" src="/images/websites/jimmy-home.webp"'), error: 'Unsupported attribute on WebsitePreview' },
    { body: valid.replace('url="https://jimmywong.dev/en"', 'url={"https://jimmywong.dev/en"}'), error: 'use static strings' },
    { body: valid.replace('title="Personal website"', 'title="Personal website" url="https://example.com"'), error: 'Duplicate attribute url' },
    { body: `Text ${valid.replaceAll('\n', ' ')} inline.`, error: 'WebsitePreview must be a standalone block' },
    { body: block(''), error: 'WebsitePreview requires exactly one Markdown image' },
    { body: block(`${image}\n\n${image}`), error: 'WebsitePreview requires exactly one Markdown image' },
    { body: block(`${image}\n\nExtra content`), error: 'WebsitePreview requires exactly one Markdown image' },
    { body: block(`[${image}](https://example.com)`), error: 'WebsitePreview requires exactly one Markdown image' },
    { body: block(image.replace('Personal website homepage', '')), error: 'Images require meaningful localized alt text' },
    { body: block(image.replace('/images/websites/jimmy-home.webp', 'https://example.com/screenshot.webp')), error: 'Unsafe or unsupported URL' },
    { body: block(image.replace('jimmy-home.webp', 'missing.webp')), error: 'Missing or invalid image' },
  ];
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-website-preview-'));
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
    await test.info().attach('Website preview authoring', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
