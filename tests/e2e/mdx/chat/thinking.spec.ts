import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('thinking authoring keeps reasoning inside a completed assistant message', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'Content validation is independent of the browser.');
  test.setTimeout(60000);
  const thought = '<ChatThinking>\n**Check the arithmetic.**\\\nUse a second method.\n</ChatThinking>';
  const message = (content: string, attributes = 'from="assistant"') => `\n<ChatMessage ${attributes}>\n${content}\n</ChatMessage>\n`;
  const examples = [
    { body: message(`${thought}\n\nThe answer is 1776.`), valid: true, error: '' },
    ...['defaultOpen', 'defaultOpen={true}', 'defaultOpen={false}'].map((setting) => ({ body: message(thought.replace('<ChatThinking>', `<ChatThinking ${setting}>`)), valid: true, error: '' })),
    ...['defaultOpen="false"', 'defaultOpen={Boolean(true)}', 'defaultOpen={1}'].map((setting) => ({ body: message(thought.replace('<ChatThinking>', `<ChatThinking ${setting}>`)), valid: false, error: 'defaultOpen must be a static boolean' })),
    { body: message(thought.replace('<ChatThinking>', '<ChatThinking defaultOpen defaultOpen={false}>')), valid: false, error: 'Duplicate attribute defaultOpen' },
    { body: '\n<ChatMessage from="assistant" state="thinking" />\n', valid: true, error: '' },
    { body: `\n${thought}\n`, valid: false, error: 'direct child of a completed assistant ChatMessage' },
    { body: message(thought, 'from="user"'), valid: false, error: 'direct child of a completed assistant ChatMessage' },
    { body: message(thought, 'from="assistant" state="thinking"'), valid: false, error: 'Thinking state does not accept content' },
    { body: message('Hidden reasoning.', 'from="assistant" state="thinking"'), valid: false, error: 'Thinking state does not accept content' },
    { body: message(`${thought}\n\n${thought}`), valid: false, error: 'at most one ChatThinking' },
    { body: message('<ChatThinking>\n\n</ChatThinking>'), valid: false, error: 'ChatThinking requires reasoning content' },
    { body: message('Text <ChatThinking>Reasoning.</ChatThinking> inline.'), valid: false, error: 'ChatThinking must be a standalone block' },
    { body: message('<ChatThinking title="Reasoning">\nCheck the result.\n</ChatThinking>'), valid: false, error: 'Unsupported attribute on ChatThinking' },
  ];
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-chat-thinking-'));
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
    await test.info().attach('thinking-authoring', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

for (const scenario of [
  { name: 'desktop', width: 1280, height: 960, javaScriptEnabled: true },
  { name: 'narrow', width: 320, height: 844, javaScriptEnabled: true },
  { name: 'enlarged', width: 390, height: 844, javaScriptEnabled: true },
  { name: 'no-js', width: 390, height: 844, javaScriptEnabled: false },
]) {
  test(`authored thinking stays separate from the answer on ${scenario.name}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: scenario, javaScriptEnabled: scenario.javaScriptEnabled });
    try {
      const page = await context.newPage();
      expect((await page.goto('/design/components'))?.status()).toBe(200);
      if (scenario.javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
      if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
      const thought = page.locator('#chat [data-component="chat-thinking"]');
      const assistant = thought.locator('..').locator('..');
      const body = thought.locator(scenario.javaScriptEnabled ? '[data-slot="thinking-content"]' : 'details [data-slot="thinking-content"]');
      const answer = assistant.locator('[data-slot="message-response"]');
      const summary = thought.locator(scenario.javaScriptEnabled ? '[data-slot="trace-collapsible-trigger"]' : 'summary');
      if (scenario.javaScriptEnabled) {
        await expect(thought.locator('[data-slot="trace"]')).toBeVisible();
        await expect(summary).toHaveAttribute('aria-expanded', 'true');
        await expect(summary).toHaveCSS('border-top-width', '0px');
      } else await expect(thought.locator('details')).toHaveAttribute('open', '');
      await expect(summary).toHaveText('Thought');
      await expect(body).toBeVisible();
      await expect(body.locator('strong')).toHaveText('Break it down.');
      await expect(body.locator('p')).toHaveCount(2);
      await expect(body.locator('br')).toHaveCount(1);
      await expect(body.getByRole('link', { name: 'another method' })).toHaveAttribute('href', '#authoring');
      await expect(answer).toHaveText('The answer is 1776.');
      await expect(answer.locator('strong')).toHaveText('1776');
      await expect(assistant.locator('[data-slot="message-avatar"]')).toHaveCount(1);
      await expect(assistant.getByRole('status')).toHaveCount(0);
      await expect(assistant.locator('[data-slot="spinner"]')).toHaveCount(0);
      expect(await assistant.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const expandedWidth = (await assistant.locator('[data-slot="message-content"]').boundingBox())!.width;
      await test.info().attach(`thinking-expanded-${scenario.name}`, { body: await assistant.screenshot(), contentType: 'image/png' });
      await summary.focus();
      await summary.press('Enter');
      if (scenario.javaScriptEnabled) await expect(summary).toHaveAttribute('aria-expanded', 'false');
      else await expect(thought.locator('details')).not.toHaveAttribute('open');
      await expect(body).toBeHidden();
      await expect(answer).toBeVisible();
      expect((await assistant.locator('[data-slot="message-content"]').boundingBox())!.width).toBeCloseTo(expandedWidth, 1);
      await test.info().attach(`thinking-collapsed-${scenario.name}`, { body: await assistant.screenshot(), contentType: 'image/png' });
      await summary.press('Space');
      await expect(body).toBeVisible();
      if (scenario.javaScriptEnabled) {
        const accessibility = await new AxeBuilder({ page }).include('#chat').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
      if (process.env.CONTENT_TEST !== '1') {
        await page.goto('/zh/courses/llm-101/how-model-thinking-works');
        if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
        const reasoning = page.locator('[data-component="chat-thinking"]');
        const trigger = reasoning.locator(scenario.javaScriptEnabled ? '[data-slot="trace-collapsible-trigger"]' : 'summary');
        const reasoningBody = reasoning.locator(scenario.javaScriptEnabled ? '[data-slot="thinking-content"]' : 'details [data-slot="thinking-content"]');
        const response = reasoning.locator('..').locator('[data-slot="message-response"]');
        await expect(reasoningBody).toBeHidden();
        await expect(response).toBeVisible();
        await trigger.click();
        await expect(reasoningBody).toBeVisible();
        await expect(reasoningBody).toContainText('先拆解：');
        await expect(reasoningBody).not.toContainText('最后回答：');
        await expect(response).toHaveText('最后回答：1776');
        await trigger.click();
        await expect(reasoningBody).toBeHidden();
        await expect(response).toBeVisible();
        await trigger.click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await test.info().attach(`thinking-lesson-${scenario.name}`, { body: await reasoning.locator('..').locator('..').screenshot(), contentType: 'image/png' });
      }
    } finally { await context.close(); }
  });
}
