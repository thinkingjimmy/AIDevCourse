import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const lesson = '/zh/courses/deepseek-101/ai-chat-advice';
const prompt = '如果你需要更多信息才能更好地回答此问题，你可以向我提问，向我索要更多信息。';
const inputSlot = '[data-chat-input]';

for (const scenario of [
  { name: 'desktop', width: 1440, javaScriptEnabled: true },
  { name: 'mobile', width: 390, javaScriptEnabled: true },
  { name: 'narrow mobile', width: 320, javaScriptEnabled: true },
  { name: 'enlarged mobile', width: 390, javaScriptEnabled: true },
  { name: 'narrow without JavaScript', width: 320, javaScriptEnabled: false },
]) {
  test(`the lesson shows the full read-only draft on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    test.skip(process.env.CONTENT_TEST === '1', 'Uses the published DeepSeek Chat lesson.');
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 900 }, javaScriptEnabled: scenario.javaScriptEnabled });
    try {
      const page = await context.newPage();
      await page.goto(lesson);
      if (scenario.name === 'enlarged mobile') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
      if (scenario.javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
      const chat = page.locator('article [data-component="chat"]').filter({ has: page.locator(inputSlot) });
      const input = chat.locator(inputSlot);
      const draft = input.getByRole('textbox', { name: '示例指令' });
      await expect(chat.locator('[data-component="chat-message"]')).toHaveCount(0);
      await expect(draft).toBeVisible();
      await expect(chat).toHaveCSS('border-top-width', '1px');
      await expect(input).toHaveCSS('border-top-width', '1px');
      const frameBounds = (await chat.boundingBox())!;
      const inputBounds = (await input.boundingBox())!;
      expect(inputBounds.x - frameBounds.x).toBeGreaterThan(1);
      await expect(draft).toHaveValue(prompt);
      await expect(draft).not.toBeEditable();
      if (scenario.javaScriptEnabled) {
        const model = input.locator('button[aria-haspopup="menu"]');
        const add = input.getByRole('button', { name: '添加附件' });
        const send = input.getByRole('button', { name: '发送消息' });
        await expect(model).toHaveAccessibleDescription('DeepSeek 模型');
        await expect(model).toHaveAccessibleName(/V4\.1 Flash$/);
        await expect(add).toBeDisabled();
        await expect(send).toBeDisabled();
        const addBounds = (await add.boundingBox())!;
        const modelBounds = (await model.boundingBox())!;
        const sendBounds = (await send.boundingBox())!;
        expect(addBounds.x).toBeLessThan(sendBounds.x);
        expect(modelBounds.x + modelBounds.width).toBeLessThan(sendBounds.x);
        expect(Math.abs(modelBounds.height - sendBounds.height)).toBeLessThan(1);
        expect(Math.abs(modelBounds.y + modelBounds.height / 2 - sendBounds.y - sendBounds.height / 2)).toBeLessThan(1);
        expect(await model.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        const hitHeight = await model.evaluate(element => parseFloat(getComputedStyle(element, '::before').minHeight));
        expect(hitHeight).toBeGreaterThanOrEqual(44);

        const menu = page.getByRole('menu', { name: 'DeepSeek 模型', exact: true });
        const flash = menu.getByRole('menuitemradio', { name: 'V4.1 Flash', exact: true });
        const pro = menu.getByRole('menuitemradio', { name: 'V4 Pro', exact: true });
        await model.press('Enter');
        await expect(flash).toBeChecked();
        const menuBounds = (await menu.boundingBox())!;
        expect(menuBounds.x).toBeGreaterThanOrEqual(0);
        expect(menuBounds.x + menuBounds.width).toBeLessThanOrEqual(scenario.width);
        const menuPath = testInfo.outputPath('model-selector.png');
        await menu.screenshot({ path: menuPath, animations: 'disabled' });
        await testInfo.attach('Model Selector', { path: menuPath, contentType: 'image/png' });
        await expect(flash).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(pro).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(menu).toBeHidden();
        await expect(model).toHaveAccessibleName(/V4 Pro$/);
        await expect(model).toBeFocused();
        await model.click();
        await expect(pro).toBeChecked();
        await page.keyboard.press('Escape');
        await expect(menu).toBeHidden();
        await expect(model).toBeFocused();
      } else {
        await expect(input.locator('noscript').getByText('DeepSeek V4.1 Flash', { exact: true })).toBeVisible();
      }
      expect(await draft.evaluate(element => element.scrollHeight <= element.clientHeight && element.scrollWidth <= element.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await draft.focus();
      await expect(input).toHaveCSS('outline-style', 'solid');
      await draft.press('A');
      await expect(draft).toHaveValue(prompt);
      await draft.blur();
      if (scenario.javaScriptEnabled) {
        const results = await new AxeBuilder({ page }).include(`article ${inputSlot}`).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(results.violations).toEqual([]);
      }
      const path = testInfo.outputPath('chat-input.png');
      await chat.screenshot({ path, animations: 'disabled' });
      await testInfo.attach('Chat input', { path, contentType: 'image/png' });
    } finally { await context.close(); }
  });
}

test('a chat can show messages above a localized read-only draft', async ({ page }, testInfo) => {
  await page.goto('/design/components?lang=en#chat-tools');
  const chat = page.locator('#chat-tools [data-component="chat"]');
  await expect(chat.locator('[data-component="chat-message"]')).toHaveCount(2);
  await expect(chat.locator('> :last-child')).toHaveAttribute('data-chat-input', '');
  await expect(chat.getByRole('textbox', { name: 'Example prompt' })).toHaveValue('Could you also check the forecast for this weekend?');
  const model = chat.getByRole('button', { name: 'DeepSeek V4.1 Flash' });
  await expect(model).toHaveAccessibleDescription('DeepSeek model');
  await expect(chat.getByRole('button', { name: 'Add attachment' })).toBeDisabled();
  await expect(chat.getByRole('button', { name: 'Send message' })).toBeDisabled();
  await testInfo.attach('Chat with messages and input', { body: await chat.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
});

test('the draft is searchable as lesson text', async ({ page, request }) => {
  test.skip(process.env.CONTENT_TEST === '1', 'Uses the published DeepSeek Chat lesson.');
  const index = await request.get('/api/search/zh');
  expect(index.ok()).toBe(true);
  expect(await index.text()).toContain(prompt);
  await page.goto('/zh');
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: '搜索课时' }).fill('向我索要更多信息');
  await expect(page.locator(`.search-result[href^="${lesson}"]`).first()).toBeVisible();
});
