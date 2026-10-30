import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

for (const scenario of [
  { name: 'desktop', width: 1280, height: 960, javaScriptEnabled: true },
  { name: 'narrow', width: 320, height: 844, javaScriptEnabled: true },
  { name: 'enlarged', width: 390, height: 844, javaScriptEnabled: true },
  { name: 'no-js', width: 390, height: 844, javaScriptEnabled: false },
]) {
  test(`MDX highlights preserve text and wrap on ${scenario.name}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: scenario, javaScriptEnabled: scenario.javaScriptEnabled });
    try {
      const page = await context.newPage();
      const response = await page.goto('/design/components');
      expect(response?.status()).toBe(200);
      const stroke = await page.request.get('/images/highlight-stroke.svg');
      expect(stroke.status()).toBe(200);
      expect(stroke.headers()['content-type']).toContain('image/svg+xml');
      if (scenario.javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
      if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
      const preview = page.locator('#highlights');
      const marks = preview.locator('mark');
      await expect(marks).toHaveCount(5);
      await expect(marks.first()).toHaveText('淡黄色高亮');
      await expect(marks.nth(1).locator('strong')).toHaveText('重点');
      await expect(marks.nth(1).locator('em')).toHaveText('强调');
      await expect(marks.nth(2).getByRole('link')).toHaveAttribute('href', '#authoring');
      await expect(preview.locator('#highlighted-heading mark')).toHaveText('Highlighted heading');
      await expect(preview.locator('p').filter({ hasText: '转义文字' })).toContainText('==escaped literal==');
      await expect(preview.locator('p').filter({ hasText: '转义文字' })).toContainText('==unclosed literal');
      await expect(preview.locator('code').filter({ hasText: '==inline literal==' })).toHaveText('==inline literal==');
      await expect(preview.locator('pre code')).toHaveText('==fenced literal==');
      await expect(preview.locator('code mark')).toHaveCount(0);
      const noteMark = page.getByRole('note', { name: 'Jimmy', exact: true }).nth(1).locator('mark');
      await expect(noteMark).toHaveText('正文没有展开的背景');
      const evidence = [];
      for (const mark of [...await marks.all(), noteMark]) {
        const style = await mark.evaluate((element) => {
          const computed = getComputedStyle(element);
          return { text: element.textContent, background: computed.backgroundColor, image: computed.backgroundImage, repeat: computed.backgroundRepeat, size: computed.backgroundSize, color: computed.color, parentColor: getComputedStyle(element.parentElement!).color,
            fontSize: computed.fontSize, parentSize: getComputedStyle(element.parentElement!).fontSize,
            decoration: computed.getPropertyValue('box-decoration-break') || computed.getPropertyValue('-webkit-box-decoration-break') };
        });
        expect(style.background).toBe('rgba(0, 0, 0, 0)');
        expect(style.image).toContain('/images/highlight-stroke.svg');
        expect(style.repeat).toBe('no-repeat');
        expect(style.size).toMatch(/^100% /);
        expect(style.color).toBe(style.parentColor);
        expect(style.fontSize).toBe(style.parentSize);
        expect(style.decoration).toBe('clone');
        evidence.push(style);
      }
      expect(await marks.nth(3).evaluate((element) => element.getClientRects().length)).toBeGreaterThan(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (scenario.javaScriptEnabled) {
        const accessibility = await new AxeBuilder({ page }).include('#highlights').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
      const screenshot = test.info().outputPath(`highlights-${scenario.name}.png`);
      await preview.screenshot({ path: screenshot, animations: 'disabled' });
      await test.info().attach('Pale yellow text highlights', { path: screenshot, contentType: 'image/png' });
      await test.info().attach('Highlight styles', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
      await preview.getByRole('link', { name: 'Jump to highlighted heading' }).click();
      await expect(page).toHaveURL(/#highlighted-heading$/);
      await expect(preview.locator('#highlighted-heading')).toBeInViewport();
    } finally { await context.close(); }
  });
}

test('highlight authoring CLI keeps heading links aligned and rejects raw mark HTML', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'The CLI has no browser-specific behavior.');
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-highlights-'));
  try {
    cpSync('tests/fixtures', join(root, 'content'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'content/en/ai-coding/foundations/first-change.mdx');
    const original = readFileSync(file, 'utf8');
    const cases = [
      { name: 'highlighted heading and link', body: '\n## ==Highlighted heading==\n\n==[Jump to highlighted heading](#highlighted-heading)==\n', valid: true },
      { name: 'raw mark HTML', body: '\n<mark>Unsupported raw markup</mark>\n', valid: false },
    ];
    const evidence = [];
    for (const example of cases) {
      writeFileSync(file, original + example.body);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/check-content.ts')], {
        cwd: root, env: { ...process.env, CONTENT_TEST: '0' }, encoding: 'utf8', timeout: 15000,
      });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      expect(result.error).toBeUndefined();
      expect(result.status === 0, output).toBe(example.valid);
      if (!example.valid) expect(output).toContain('Unknown component: mark');
      evidence.push({ name: example.name, status: result.status, output });
    }
    await test.info().attach('Highlight authoring CLI', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
