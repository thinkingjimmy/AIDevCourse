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
  test(`MDX formulas render and scroll on ${scenario.name}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: scenario, javaScriptEnabled: scenario.javaScriptEnabled });
    try {
      const page = await context.newPage();
      const fonts: { url: string; status: number }[] = [];
      page.on('response', (response) => {
        if (/\.(woff2?|ttf)(?:\?|$)/.test(response.url())) fonts.push({ url: response.url(), status: response.status() });
      });
      expect((await page.goto('/design/components'))?.status()).toBe(200);
      if (scenario.javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
      if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
      const preview = page.locator('#math');
      await expect(preview.locator('.katex')).toHaveCount(8);
      await expect(preview.locator('.katex-display')).toHaveCount(5);
      await expect(preview.locator('math')).toHaveCount(8);
      await expect(preview.locator('.katex-html[aria-hidden="true"]')).toHaveCount(8);
      await expect(preview.locator('.katex-error')).toHaveCount(0);
      const annotations = await preview.locator('annotation[encoding="application/x-tex"]').allTextContents();
      expect(annotations).toContain('y = ax + b');
      expect(annotations).toContain('x_i^2 + \\frac{1}{2}');
      expect(annotations.some((source) => source.includes('\\sum'))).toBe(true);
      expect(annotations.some((source) => source.includes('\\begin{bmatrix}'))).toBe(true);
      expect(annotations.some((source) => source.includes('\\begin{aligned}'))).toBe(true);
      await expect(preview.getByRole('note', { name: 'Jimmy', exact: true }).locator('.katex')).toHaveCount(1);
      await expect(preview.locator('p').filter({ hasText: '价格使用转义' })).toHaveText('价格使用转义美元符号：$10 与 $20。');
      await expect(preview.locator('p').filter({ hasText: '未闭合标记' })).toContainText('$unclosed literal');
      await expect(preview.locator('code').filter({ hasText: '$y = ax + b$' })).toHaveText('$y = ax + b$');
      await expect(preview.locator('pre code')).toHaveText('$$\ny = ax + b\n$$');
      await expect(preview.locator('code .katex')).toHaveCount(0);
      const geometry = await preview.locator('.katex-display').evaluateAll((elements) => elements.map((element) => {
        const style = getComputedStyle(element);
        const formula = element.querySelector('.katex-html')!;
        const bounds = element.getBoundingClientRect();
        const formulaBounds = formula.getBoundingClientRect();
        return { width: bounds.width, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, overflow: style.overflowX,
          fontSize: getComputedStyle(formula).fontSize, marginTop: style.marginTop, paddingTop: style.paddingTop,
          centered: Math.abs((formulaBounds.left + formulaBounds.right) / 2 - (bounds.left + bounds.right) / 2) < 2 };
      }));
      for (const formula of geometry) {
        expect(formula.overflow).toBe('auto');
        expect(parseFloat(formula.marginTop)).toBeGreaterThan(0);
        expect(parseFloat(formula.paddingTop)).toBeGreaterThan(0);
      }
      expect(geometry[0].centered).toBe(true);
      expect(geometry.at(-1)!.scrollWidth).toBeGreaterThan(geometry.at(-1)!.clientWidth);
      const longFormula = preview.locator('.katex-display').last();
      await expect(longFormula).toHaveAttribute('tabindex', '0');
      await longFormula.focus();
      // Holding the key also exercises WebKit's native keyboard scroll animation.
      await page.keyboard.down('ArrowRight');
      try { await expect.poll(() => longFormula.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0); }
      finally { await page.keyboard.up('ArrowRight'); }
      await longFormula.evaluate((element) => { element.scrollLeft = 0; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(fonts.some((font) => /KaTeX/.test(font.url))).toBe(true);
      expect(fonts.every((font) => new URL(font.url).origin === new URL(baseURL!).origin && font.status === 200)).toBe(true);
      if (scenario.javaScriptEnabled) {
        const accessibility = await new AxeBuilder({ page }).include('#math').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
      const screenshot = test.info().outputPath(`formulas-${scenario.name}.png`);
      await preview.screenshot({ path: screenshot, animations: 'disabled', style: 'header { visibility: hidden; }' });
      await test.info().attach('Math preview', { path: screenshot, contentType: 'image/png' });
      await test.info().attach('Formula evidence', { body: JSON.stringify({ scenario, annotations, geometry, fonts }, null, 2), contentType: 'application/json' });
      expect((await page.goto('/zh/courses/llm-101/how-models-calculate-token-probabilities'))?.status()).toBe(200);
      const published = page.locator('.course-prose .katex-display');
      await expect(published).toHaveCount(1);
      await expect(published.locator('annotation')).toHaveText('y = ax + b');
      const lessonScreenshot = test.info().outputPath(`formula-lesson-${scenario.name}.png`);
      await published.screenshot({ path: lessonScreenshot });
      await test.info().attach('Published formula', { path: lessonScreenshot, contentType: 'image/png' });
    } finally { await context.close(); }
  });
}

test('formula authoring CLI validates LaTeX with original source positions', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'The CLI has no browser-specific behavior.');
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-math-'));
  try {
    cpSync('tests/fixtures', join(root, 'content'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'content/en/ai-coding/foundations/first-change.mdx');
    const original = readFileSync(file, 'utf8');
    const examples = [
      { name: 'inline and block with braces', body: '\nInline $y = ax + b$.\n\n$$\n\\frac{1}{n} \\sum_{i=1}^{n} x_i\n$$\n', valid: true },
      { name: 'escaped and code literals', body: '\nPrice \\$10 and \\$20. `$\\invalidCommand{1}$`\n\n```text\n$\\invalidCommand{1}$\n```\n', valid: true },
      { name: 'invalid fraction', body: '\n\n$\\frac{1}{$\n', valid: false },
      { name: 'unknown command', body: '\n\n$\\invalidCommand{1}$\n', valid: false },
      { name: 'raw HTML remains forbidden', body: '\n<span>Raw markup</span>\n', valid: false },
    ];
    const evidence = [];
    for (const example of examples) {
      const source = original + example.body;
      writeFileSync(file, source);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/check-content.ts')], {
        cwd: root, env: { ...process.env, CONTENT_TEST: '0' }, encoding: 'utf8', timeout: 15000,
      });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      expect(result.error).toBeUndefined();
      expect(result.status === 0, output).toBe(example.valid);
      if (example.name === 'invalid fraction' || example.name === 'unknown command') {
        const line = source.slice(0, source.lastIndexOf('$\\')).split('\n').length;
        expect(output).toContain(`${file}:${line}:1: Invalid math:`);
      }
      if (example.name === 'raw HTML remains forbidden') expect(output).toContain('Unknown component: span');
      evidence.push({ name: example.name, status: result.status, output });
    }
    await test.info().attach('Math authoring CLI', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
