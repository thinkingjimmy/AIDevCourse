import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const lesson = '/zh/courses/llm-101/what-is-an-agent';
const body = readFileSync('content/zh/llm-101/ai-applications/what-is-an-agent.mdx', 'utf8');
const source = [...body.matchAll(/```json[^\n]*\n([\s\S]*?)\n```/g)].find(match => match[1].includes('# 第一次思考和工具调用'))![1];
test.skip(process.env.CONTENT_TEST === '1', 'Uses the published agent lesson.');

for (const scenario of [
  { name: 'desktop', width: 1440, fontSize: 16, javaScriptEnabled: true },
  { name: 'narrow', width: 320, fontSize: 16, javaScriptEnabled: true },
  { name: 'enlarged', width: 390, fontSize: 24, javaScriptEnabled: true },
  { name: 'no-js', width: 390, fontSize: 16, javaScriptEnabled: false },
]) {
  test(`the first tool round folds independently and preserves the full code on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 960 },
      javaScriptEnabled: scenario.javaScriptEnabled, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
          writeText: async (text: string) => { document.documentElement.dataset.copiedCode = text; },
        } });
      });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(lesson);
      if (scenario.javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
      if (scenario.fontSize !== 16) await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, scenario.fontSize);
      const block = page.locator('[data-component="code-block"][data-foldable]');
      const fold = block.locator('details');
      const trigger = fold.locator('summary');
      const hidden = fold.locator('pre');
      const viewport = block.locator('figure > [role="region"]');
      await expect(block).toHaveCount(1);
      await block.scrollIntoViewIfNeeded();
      await expect(fold).not.toHaveAttribute('open');
      await expect(trigger).toContainText('# 第一次思考和工具调用');
      await expect(trigger).toContainText('18 行');
      await expect(hidden).toBeHidden();
      const secondRound = block.locator('.line').filter({ hasText: '# 第二次思考和工具调用' });
      await expect(secondRound).toBeVisible();
      const collapsedHeight = await viewport.evaluate(element => element.scrollHeight);
      if (scenario.javaScriptEnabled) {
        await block.getByRole('button', { name: '复制代码', exact: true }).click();
        await expect.poll(() => page.evaluate(() => document.documentElement.dataset.copiedCode)).toBe(source);
      } else await expect(block.locator('.copy-button')).toBeHidden();
      await testInfo.attach(`Code collapsed ${scenario.name}`, { body: await block.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
      await trigger.focus();
      await expect(trigger).toBeFocused();
      await trigger.press('Enter');
      await expect(fold).toHaveAttribute('open', '');
      await expect(hidden).toBeVisible();
      await expect(hidden).toContainText('Inception movie director');
      const tokenColors = await hidden.locator('span[style]').evaluateAll(tokens =>
        tokens.map(token => getComputedStyle(token).color));
      expect(new Set(tokenColors).size).toBeGreaterThan(1);
      const expandedHeight = await viewport.evaluate(element => element.scrollHeight);
      expect(expandedHeight).toBeGreaterThan(collapsedHeight);
      await expect(secondRound).toBeVisible();
      if (scenario.javaScriptEnabled) {
        await block.getByRole('button', { name: '复制代码', exact: true }).click();
        await expect.poll(() => page.evaluate(() => document.documentElement.dataset.copiedCode)).toBe(source);
        const accessibility = await new AxeBuilder({ page }).include('[data-component="code-block"][data-foldable]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
      await testInfo.attach(`Code expanded ${scenario.name}`, { body: await block.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
      await trigger.press('Space');
      await expect(hidden).toBeHidden();
      await expect(secondRound).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach('Fold geometry and original source', { body: JSON.stringify({ collapsedHeight, expandedHeight, source }, null, 2), contentType: 'application/json' });
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}

test('multiple folds remain independent and ordinary blocks retain their copy behavior', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (text: string) => { document.documentElement.dataset.copiedCode = text; },
    } });
  });
  await page.goto('/design/components?lang=en');
  const section = page.locator('#code-folding');
  const block = section.locator('[data-foldable]');
  const folds = block.locator('details');
  await expect(folds).toHaveCount(2);
  await expect(folds.first()).not.toHaveAttribute('open');
  await expect(folds.last()).not.toHaveAttribute('open');
  await folds.first().locator('summary').click();
  await expect(folds.first()).toHaveAttribute('open', '');
  await expect(folds.last()).not.toHaveAttribute('open');
  await folds.last().locator('summary').click();
  await expect(folds.last()).toHaveAttribute('open', '');
  await block.getByRole('button', { name: 'Copy code', exact: true }).click();
  const copied = await page.evaluate(() => document.documentElement.dataset.copiedCode);
  expect(copied).toContain('\n\n');
  expect(copied).not.toContain('lines');
  const plain = section.locator('[data-component="code-block"]:not([data-foldable])');
  await expect(plain.locator('details')).toHaveCount(0);
  await plain.getByRole('button', { name: 'Copy code', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.copiedCode)).toBe('console.log("No folds.");');
  await testInfo.attach('Independent code folds', { body: await section.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
});
