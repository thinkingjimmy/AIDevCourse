import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const lesson = '/zh/courses/llm-101/what-is-a-tool';
const sourceURL = 'https://www.weather.com.cn/weather/101280101.shtml';

test('inline citation authoring accepts only inline sources with safe static URLs', async ({ browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'Content validation is independent of the browser.');
  test.setTimeout(60000);
  const citation = (attributes: string, children?: string) => children === undefined ? `<InlineCitation ${attributes} />` : `<InlineCitation ${attributes}>${children}</InlineCitation>`;
  const inline = (body: string) => `\nA supported claim ${body}.\n`;
  const examples = [
    { body: inline(citation(`url="${sourceURL}" title="Guangzhou forecast" description="Read the source."`)), valid: true, error: '' },
    { body: inline(citation(`url="${sourceURL}"`)), valid: true, error: '' },
    { body: `\n${citation(`url="${sourceURL}"`)}\n`, valid: false, error: 'InlineCitation must be inline' },
    { body: inline(citation(`url="${sourceURL}"`, 'Extra text')), valid: false, error: 'InlineCitation does not accept children' },
    { body: inline(citation('title="Source"')), valid: false, error: 'InlineCitation requires an absolute HTTPS URL' },
    { body: inline(citation('url="javascript:alert(1)"')), valid: false, error: 'InlineCitation requires an absolute HTTPS URL' },
    { body: inline(citation('url="https://user:password@example.com/"')), valid: false, error: 'InlineCitation requires an absolute HTTPS URL' },
    { body: inline(citation(`url="${sourceURL}" title=""`)), valid: false, error: 'InlineCitation title must not be empty' },
    { body: inline(citation(`url="${sourceURL}" description=""`)), valid: false, error: 'InlineCitation description must not be empty' },
    { body: inline(citation(`url="${sourceURL}" onClick="run"`)), valid: false, error: 'Unsupported attribute on InlineCitation' },
  ];
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-inline-citation-'));
  try {
    cpSync('tests/fixtures', join(root, 'content'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'content/en/ai-coding/foundations/first-change.mdx');
    const original = readFileSync(file, 'utf8');
    const evidence = [];
    for (const example of examples) {
      writeFileSync(file, original + example.body);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/check-content.ts')], {
        cwd: root, env: { ...process.env, CONTENT_TEST: '0' }, encoding: 'utf8', timeout: 15000,
      });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      expect(result.error).toBeUndefined();
      expect(result.status === 0, output).toBe(example.valid);
      if (example.error) expect(output).toContain(example.error);
      evidence.push({ ...example, status: result.status, output });
    }
    await testInfo.attach('inline-citation-authoring', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

for (const scenario of [
  { name: 'desktop', width: 1440, height: 960, javaScriptEnabled: true },
  { name: 'narrow', width: 320, height: 844, javaScriptEnabled: true },
  { name: 'enlarged', width: 390, height: 844, javaScriptEnabled: true },
  { name: 'no-js', width: 390, height: 844, javaScriptEnabled: false },
]) {
  test(`the lesson citation previews and opens its source on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    test.skip(process.env.CONTENT_TEST === '1', 'Uses the published tool lesson.');
    const context = await browser.newContext({ baseURL, viewport: scenario, javaScriptEnabled: scenario.javaScriptEnabled });
    try {
      await context.route(sourceURL, (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Weather source opened</h1>' }));
      const page = await context.newPage();
      expect((await page.goto(lesson))?.status()).toBe(200);
      if (scenario.javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
      if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
      const citation = page.locator('article [data-component="inline-citation"]');
      await expect(citation).toHaveCount(1);
      const chat = page.locator('article [data-component="chat"]').filter({ has: page.locator('[data-component="inline-citation"]') });
      await expect(chat).toHaveCount(1);
      expect(await chat.evaluate((element) => element.previousElementSibling?.textContent)).toContain('部分产品会在 message 消息里加上一个 inline citation');
      const call = chat.locator('[data-component="chat-tool-call"]');
      if (scenario.javaScriptEnabled) await expect(call.locator('[data-slot="trace-collapsible-trigger"]')).toHaveAttribute('aria-expanded', 'false');
      else await expect(call.locator('details')).not.toHaveAttribute('open');
      const trigger = citation.locator('[data-citation-trigger]');
      await expect(trigger).toHaveAttribute('href', sourceURL);
      await expect(trigger).toHaveAttribute('target', '_blank');
      await expect(trigger).toHaveAttribute('data-variant', 'secondary');
      await expect(trigger).toHaveAttribute('data-size', 'xs');
      await expect(trigger).toContainText('weather.com.cn');
      await expect(trigger).toHaveCSS('text-decoration-line', 'none');
      await trigger.scrollIntoViewIfNeeded();
      if (scenario.javaScriptEnabled) {
        const card = page.locator('[data-component="inline-citation-preview"]');
        await trigger.hover();
        await expect(card).toBeVisible();
        await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        await expect(card).toContainText('广州天气预报');
        await expect(card.getByRole('link')).toHaveAttribute('href', sourceURL);
        const bounds = (await card.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(scenario.width);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(scenario.height);
        await page.mouse.move(0, 0);
        await trigger.focus();
        await expect(card).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(card).toBeHidden();
        await expect(trigger).toBeFocused();
        await trigger.hover();
        await expect(card).toBeVisible();
        const accessibility = await new AxeBuilder({ page }).include('[data-component="inline-citation"]').include('[data-component="inline-citation-preview"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach(`inline-citation-${scenario.name}`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
      const popupPromise = page.waitForEvent('popup');
      await trigger.click();
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded');
      await expect(popup).toHaveURL(sourceURL);
      await expect(popup.getByRole('heading')).toHaveText('Weather source opened');
      await testInfo.attach('citation-source-navigation', { body: JSON.stringify({ from: page.url(), source: popup.url(), externalResponse: 'Local test fixture' }, null, 2), contentType: 'application/json' });
    } finally { await context.close(); }
  });
}

test('touch opens the citation source with one tap', async ({ browser, baseURL }, testInfo) => {
  test.skip(process.env.CONTENT_TEST === '1', 'Uses the published tool lesson.');
  const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 } });
  try {
    await context.route(sourceURL, (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Weather source opened</h1>' }));
    const page = await context.newPage();
    await page.goto(lesson);
    const trigger = page.locator('article [data-citation-trigger]');
    const popupPromise = page.waitForEvent('popup');
    await trigger.tap();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(sourceURL);
    await testInfo.attach('inline-citation-touch', { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
  } finally { await context.close(); }
});

test('citation labels follow the selected preview language', async ({ page }, testInfo) => {
  const evidence = [];
  for (const [locale, label] of [['en', 'View source'], ['zh', '查看来源'], ['ja', '出典を表示'], ['fr', 'Voir la source'], ['es', 'Ver fuente']]) {
    await page.goto(`/design/components?lang=${locale}`);
    const trigger = page.locator('#inline-citations [data-citation-trigger]');
    await expect(trigger).toHaveAttribute('aria-label', new RegExp(label));
    evidence.push({ locale, label: await trigger.getAttribute('aria-label') });
  }
  await testInfo.attach('inline-citation-locales', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});
