import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const lesson = '/zh/courses/llm-101/how-ai-chat-works';

async function capture(figure: Locator, name: string) {
  await figure.scrollIntoViewIfNeeded();
  const path = test.info().outputPath(`${name}.png`);
  await figure.screenshot({ path, animations: 'disabled', style: 'header, .mobile-course-bar, button.sticky { visibility: hidden !important; }' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

async function geometry(figure: Locator) {
  return figure.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const bubble = element.querySelector<HTMLElement>('[data-message-bubble]')!;
    const box = bubble.getBoundingClientRect();
    const arrow = element.querySelector('[data-current="true"] svg')!.getBoundingClientRect();
    const overflow = [...element.querySelectorAll('*')].filter((child) => {
      const rect = child.getBoundingClientRect();
      return rect.width > 0 && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1);
    }).map((child) => child.tagName);
    const tailX = box.left + parseFloat(bubble.style.getPropertyValue('--tail-x')) + 6;
    const gap = bubble.dataset.side === 'above' ? arrow.top + 6 - box.bottom : box.top - (arrow.top + 6);
    return { height: bounds.height, overflow, anchorError: Math.abs(tailX - (arrow.left + arrow.width / 2)), gap, position: getComputedStyle(bubble).position };
  });
}

test.describe('Chat message sequence', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'The sequence belongs to the published lesson.');
  for (const scenario of [
    { name: 'desktop', width: 1280, height: 960 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'narrow', width: 320, height: 844 },
    { name: 'enlarged', width: 320, height: 960 },
  ]) {
    test(`rejects raw text and returns JSON automatically on ${scenario.name}`, async ({ page }) => {
      test.setTimeout(60000);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setViewportSize(scenario);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      expect((await page.goto(lesson))?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
      const figure = page.getByRole('figure', { name: 'Chat 消息传递的自动时序演示' });
      await figure.scrollIntoViewIfNeeded();
      expect(await figure.evaluate((element) => element.previousElementSibling?.textContent)).toContain('整个过程就像是你寄信');
      await figure.getByRole('button', { name: '暂停', exact: true }).click();
      await page.clock.install();
      await figure.getByRole('button', { name: '重新演示', exact: true }).click();
      const measurements: Awaited<ReturnType<typeof geometry>>[] = [];
      async function check(attempt: number, step: number) {
        await expect(figure).toHaveAttribute('data-attempt', String(attempt));
        await expect(figure).toHaveAttribute('data-step', String(step));
        await expect.poll(async () => Math.abs((await geometry(figure)).gap - 12)).toBeLessThan(1);
        const measurement = await geometry(figure);
        expect(measurement.overflow).toEqual([]);
        expect(measurement.anchorError).toBeLessThan(1);
        expect(measurement.position).toBe('absolute');
        measurements.push(measurement);
      }
      await check(0, 0);
      await page.clock.runFor(1800); await check(0, 1);
      await expect(figure.getByText('格式错误', { exact: true })).toBeVisible();
      await expect(figure.locator('[data-message-bubble]')).toHaveAttribute('data-format', 'invalid');
      await capture(figure, `invalid-format-${scenario.name}`);
      await figure.getByRole('button', { name: '暂停', exact: true }).click();
      await page.clock.runFor(5000); await check(0, 1);
      await figure.getByRole('button', { name: '继续', exact: true }).click();
      await page.clock.runFor(1800); await check(0, 2);
      await expect(figure.locator('[data-model-state]')).toHaveText('未调用');
      await capture(figure, `rejected-${scenario.name}`);
      await page.clock.runFor(2300); await check(0, 3);
      await page.clock.runFor(2600); await check(1, 0);
      await page.clock.runFor(1800); await check(1, 1);
      await expect(figure.getByText('格式正确', { exact: true })).toBeVisible();
      expect(JSON.parse(await figure.locator('[data-sequence-json="request"]').innerText())).toEqual({ model: 'example-model', messages: [{ role: 'user', content: '你好，我叫 Jimmy。' }] });
      await capture(figure, `valid-format-${scenario.name}`);
      await page.clock.runFor(2600); await check(1, 2);
      await expect(figure.locator('[data-model-state]')).toHaveText('运行中');
      await page.clock.runFor(1800); await check(1, 3);
      await page.clock.runFor(1800); await check(1, 4);
      expect(JSON.parse(await figure.locator('[data-sequence-json="response"]').innerText())).toEqual({ message: { role: 'assistant', content: 'Jimmy，你好！' } });
      await capture(figure, `json-response-${scenario.name}`);
      await page.clock.runFor(1800); await check(1, 5);
      await expect(figure.locator('[data-sequence-message]')).toHaveText('Jimmy，你好！');
      await expect(figure.locator('[data-sequence-json]')).toHaveCount(0);
      await page.clock.runFor(2000);
      await expect(figure).toHaveAttribute('data-finished', 'true');
      await page.clock.runFor(6000);
      await expect(figure).toHaveAttribute('data-step', '5');
      await capture(figure, `completed-${scenario.name}`);
      expect(Math.max(...measurements.map((value) => value.height)) - Math.min(...measurements.map((value) => value.height))).toBeLessThan(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const accessibility = await new AxeBuilder({ page }).include('[data-chat-sequence]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await figure.getByRole('button', { name: '再次播放', exact: true }).focus();
      await page.keyboard.press('Enter'); await check(0, 0);
      expect(errors).toEqual([]);
      await test.info().attach('sequence-layout', { body: JSON.stringify({ measurements, errors }, null, 2), contentType: 'application/json' });
    });
  }

  test('both attempts are readable without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
    try {
      const page = await context.newPage();
      await page.goto(lesson);
      const figure = page.getByRole('figure', { name: 'Chat 消息传递的自动时序演示' });
      await expect(figure.getByText('格式错误', { exact: true })).toBeVisible();
      await expect(figure.getByText('格式正确', { exact: true })).toBeVisible();
      await expect(figure.locator('noscript [data-sequence-json="response"]')).toBeVisible();
      await expect(figure.getByRole('button')).toHaveCount(0);
      expect(await figure.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await capture(figure, 'no-javascript');
    } finally { await context.close(); }
  });
});
