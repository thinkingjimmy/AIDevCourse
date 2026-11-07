import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('tool call authoring requires named, nonempty blocks inside completed assistant messages', async ({ browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'Content validation is independent of the browser.');
  test.setTimeout(60000);
  const call = (body = 'Search results.', attributes = 'name="search_web" title="Search the web"') => `<ChatToolCall ${attributes}>\n${body}\n</ChatToolCall>`;
  const message = (body: string, attributes = 'from="assistant"') => `\n<ChatMessage ${attributes}>\n${body}\n</ChatMessage>\n`;
  const examples = [
    { body: message(`${call()}\n\nThe forecast is light rain.`), valid: true, error: '' },
    ...['defaultOpen', 'defaultOpen={true}', 'defaultOpen={false}'].map((setting) => ({ body: message(call('Results.', `name="search_web" title="Search" ${setting}`)), valid: true, error: '' })),
    ...['defaultOpen="false"', 'defaultOpen={Boolean(true)}', 'defaultOpen={1}'].map((setting) => ({ body: message(call('Results.', `name="search_web" title="Search" ${setting}`)), valid: false, error: 'defaultOpen must be a static boolean' })),
    { body: message(call('Results.', 'name="search_web" title="Search" defaultOpen defaultOpen={false}')), valid: false, error: 'Duplicate attribute defaultOpen' },
    { body: message(`${call()}\n\n${call()}`), valid: true, error: '' },
    { body: message(`<ChatThinking>\nCheck current information.\n</ChatThinking>\n\n${call()}`), valid: true, error: '' },
    { body: `\n${call()}\n`, valid: false, error: 'direct child of a completed assistant ChatMessage' },
    { body: message(call(), 'from="user"'), valid: false, error: 'direct child of a completed assistant ChatMessage' },
    { body: message(call(), 'from="assistant" state="thinking"'), valid: false, error: 'Thinking state does not accept content' },
    { body: message('Text <ChatToolCall name="search_web" title="Search">Result.</ChatToolCall> inline.'), valid: false, error: 'ChatToolCall must be a standalone block' },
    { body: message(call('')), valid: false, error: 'ChatToolCall requires content' },
    { body: message(call('Results.', 'title="Search"')), valid: false, error: 'ChatToolCall requires a nonempty name' },
    { body: message(call('Results.', 'name="search_web"')), valid: false, error: 'ChatToolCall requires a nonempty title' },
    { body: message(call('Results.', 'name="search_web" title="Search" open="true"')), valid: false, error: 'Unsupported attribute on ChatToolCall' },
    { body: message(call(call())), valid: false, error: 'direct child of a completed assistant ChatMessage' },
  ];
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-tool-call-'));
  try {
    cpSync('tests/fixtures', join(root, 'tests/fixtures'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'tests/fixtures/en/ai-coding/foundations/first-change.mdx');
    const original = readFileSync(file, 'utf8');
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
      evidence.push({ ...example, status: result.status, output });
    }
    await testInfo.attach('tool-call-authoring', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

for (const scenario of [
  { name: 'desktop', width: 1280, height: 960, javaScriptEnabled: true },
  { name: 'narrow', width: 320, height: 844, javaScriptEnabled: true },
  { name: 'enlarged', width: 390, height: 844, javaScriptEnabled: true },
  { name: 'no-js', width: 390, height: 844, javaScriptEnabled: false },
]) {
  test(`tool calls keep inputs, results, and the answer readable on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: scenario, javaScriptEnabled: scenario.javaScriptEnabled });
    try {
      const page = await context.newPage();
      expect((await page.goto('/design/components'))?.status()).toBe(200);
      if (scenario.javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
      if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
      const section = page.locator('#chat-tools');
      const call = section.locator('[data-component="chat-tool-call"]');
      const assistant = section.locator('[data-from="assistant"]');
      const summary = call.locator(scenario.javaScriptEnabled ? '[data-slot="trace-collapsible-trigger"]' : 'summary');
      const content = call.locator(scenario.javaScriptEnabled ? '[data-slot="tool-call-content"]' : 'details [data-slot="tool-call-content"]');
      const answer = assistant.locator('[data-slot="message-response"]');
      const thought = assistant.locator('[data-component="chat-thinking"]');
      const thoughtSummary = thought.locator(scenario.javaScriptEnabled ? '[data-slot="trace-collapsible-trigger"]' : 'summary');
      const thoughtBody = thought.locator(scenario.javaScriptEnabled ? '[data-slot="thinking-content"]' : 'details [data-slot="thinking-content"]');
      await expect(call).toHaveAttribute('data-tool', 'search_web');
      if (scenario.javaScriptEnabled) {
        await expect(summary).toHaveAttribute('aria-expanded', 'false');
        await expect(thoughtSummary).toHaveAttribute('aria-expanded', 'false');
      } else {
        await expect(call.locator('details')).not.toHaveAttribute('open');
        await expect(thought.locator('details')).not.toHaveAttribute('open');
      }
      await expect(content).toBeHidden();
      await expect(thoughtBody).toBeHidden();
      await expect(answer).toBeVisible();
      await testInfo.attach(`tool-call-initial-${scenario.name}`, { body: await section.screenshot(), contentType: 'image/png' });
      await summary.focus();
      await summary.press('Enter');
      if (scenario.javaScriptEnabled) await expect(summary).toHaveAttribute('aria-expanded', 'true');
      else await expect(call.locator('details')).toHaveAttribute('open', '');
      await expect(summary).toContainText('Search the web');
      await expect(summary).toHaveAccessibleName('Search the web · 已完成');
      await expect(call.locator('[data-slot="badge"]')).toHaveCount(0);
      if (scenario.javaScriptEnabled) await expect(call.locator('[data-slot="trace"]')).toBeVisible();
      if (scenario.javaScriptEnabled) await expect(summary).toHaveCSS('border-top-width', '0px');
      expect(await summary.locator('[data-slot="trace-title"]').evaluate((element) => {
        const word = document.createRange();
        word.setStart(element.firstChild!, 0);
        word.setEnd(element.firstChild!, 'Search'.length);
        return word.getClientRects().length;
      })).toBe(1);
      await expect(content).toBeVisible();
      await expect(answer).toHaveText('The forecast is light rain, 23–28 °C.');
      await expect(assistant.locator('[data-slot="message-avatar"]')).toHaveCount(1);
      await expect(assistant.locator('[data-component="chat-thinking"]')).toBeVisible();
      await expect(summary).toHaveCSS('cursor', 'pointer');
      expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const width = (await assistant.locator('[data-slot="message-content"]').boundingBox())!.width;
      await expect(content).toContainText('search_web');
      await expect(content.locator('[data-slot="code-block"][data-size="sm"]')).toHaveCount(2);
      await expect(content.locator('[data-slot="code-block-content"][data-wrap]')).toHaveCount(2);
      const [input, output] = (await content.locator('pre').allTextContents()).map((value) => JSON.parse(value));
      expect(input.query).toBe('Guangzhou weather forecast for tomorrow');
      expect(output).toEqual({ forecast: 'Light rain', temperature_range: '23-28 C' });
      await expect(thoughtBody).toBeHidden();
      await thoughtSummary.click();
      await expect(thoughtBody).toBeVisible();
      await expect(content).toBeVisible();
      await thoughtSummary.click();
      await expect(thoughtBody).toBeHidden();
      await expect(content).toBeVisible();
      await expect(answer).toBeVisible();
      expect((await assistant.locator('[data-slot="message-content"]').boundingBox())!.width).toBeCloseTo(width, 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await call.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await testInfo.attach(`tool-call-expanded-${scenario.name}`, { body: await section.screenshot(), contentType: 'image/png' });
      await summary.focus();
      await summary.press('Enter');
      if (scenario.javaScriptEnabled) await expect(summary).toHaveAttribute('aria-expanded', 'false');
      else await expect(call.locator('details')).not.toHaveAttribute('open');
      await expect(content).toBeHidden();
      await expect(answer).toBeVisible();
      expect((await assistant.locator('[data-slot="message-content"]').boundingBox())!.width).toBeCloseTo(width, 1);
      await testInfo.attach(`tool-call-collapsed-${scenario.name}`, { body: await section.screenshot(), contentType: 'image/png' });
      await summary.press('Space');
      await expect(content).toBeVisible();
      await expect(answer).toBeVisible();
      if (scenario.javaScriptEnabled) {
        const accessibility = await new AxeBuilder({ page }).include('#chat-tools').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
    } finally { await context.close(); }
  });
}

test('tool call accessible completion labels follow the preview language', async ({ page }, testInfo) => {
  const evidence = [];
  for (const [locale, label] of [['en', 'Completed'], ['zh', '已完成'], ['ja', '完了'], ['fr', 'Terminé'], ['es', 'Completado']]) {
    await page.goto(`/design/components?lang=${locale}`);
    const call = page.locator('#chat-tools [data-component="chat-tool-call"]');
    const trigger = call.locator('[data-slot="trace-collapsible-trigger"]');
    await expect(trigger).toHaveAccessibleName(`Search the web · ${label}`);
    evidence.push({ locale, label: await trigger.getAttribute('aria-label') });
  }
  await testInfo.attach('tool-call-locales', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});
