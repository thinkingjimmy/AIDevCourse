import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { htmlLanguages } from '../../../../src/lib/i18n/config';
import { localePath } from '../../../../src/lib/i18n/routing';

const locales = ['zh', 'en', 'ja', 'fr', 'es'] as const;

async function capture(figure: Locator, name: string) {
  const page = figure.page();
  const viewport = page.viewportSize()!;
  const height = Math.ceil((await figure.boundingBox())!.height);
  await page.setViewportSize({ ...viewport, height: Math.max(viewport.height, height + 320) });
  const path = test.info().outputPath(`${name}.png`);
  try {
    await figure.scrollIntoViewIfNeeded();
    await figure.screenshot({ path, animations: 'disabled', style: 'header, .mobile-course-bar, button.sticky { visibility: hidden !important; }' });
    await test.info().attach(name, { path, contentType: 'image/png' });
  } finally { await page.setViewportSize(viewport); }
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
    const controls = element.querySelector('[data-sequence-controls]')!.getBoundingClientRect();
    const actorsBottom = Math.max(...[...element.querySelectorAll('[data-sequence-actor]')].map((actor) => actor.getBoundingClientRect().bottom));
    return { height: bounds.height, overflow, anchorError: Math.abs(tailX - (arrow.left + arrow.width / 2)), gap,
      controlsOverlap: box.bottom > controls.top, actorsOverlap: box.top < actorsBottom,
      position: getComputedStyle(bubble).position };
  });
}

test.describe('Chat message sequence', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'The sequence belongs to the published lesson.');
  for (const locale of locales) {
    const copy = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8')).ChatSequence;
    const lesson = localePath(locale, '/courses/llm-101/how-ai-chat-works');
    for (const scenario of [
      { name: 'desktop', width: 1280, height: 960 },
      { name: 'mobile', width: 390, height: 844 },
      { name: 'narrow', width: 320, height: 844 },
      { name: 'enlarged', width: 320, height: 960 },
    ].filter((scenario) => locale === 'zh' || ['desktop', 'enlarged'].includes(scenario.name))) {
      test(`${locale}: rejects raw text and returns JSON automatically on ${scenario.name}`, async ({ page }) => {
        test.setTimeout(60000);
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.setViewportSize(scenario);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        expect((await page.goto(lesson))?.status()).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
        const figure = page.getByRole('figure', { name: copy.label });
        await figure.scrollIntoViewIfNeeded();
        await expect(figure).toHaveAttribute('lang', htmlLanguages[locale]);
        await expect(figure.getByRole('group')).toHaveAccessibleName(copy.actorsLabel);
        await figure.getByRole('button', { name: copy.pause, exact: true }).click();
        await page.clock.install();
        await figure.getByRole('button', { name: copy.replay, exact: true }).click();
        const measurements: Awaited<ReturnType<typeof geometry>>[] = [];
        async function check(attempt: number, step: number) {
          await expect(figure).toHaveAttribute('data-attempt', String(attempt));
          await expect(figure).toHaveAttribute('data-step', String(step));
          await expect.poll(async () => Math.abs((await geometry(figure)).gap - 12)).toBeLessThan(1);
          const measurement = await geometry(figure);
          expect(measurement.overflow).toEqual([]);
          expect(measurement.anchorError).toBeLessThan(1);
          expect(measurement.controlsOverlap).toBe(false);
          expect(measurement.actorsOverlap).toBe(false);
          expect(measurement.position).toBe('absolute');
          measurements.push(measurement);
        }
        await check(0, 0);
        await page.clock.runFor(1800); await check(0, 1);
        await expect(figure.getByText(copy.invalidFormat, { exact: true })).toBeVisible();
        await expect(figure.locator('[data-message-bubble]')).toHaveAttribute('data-format', 'invalid');
        await capture(figure, `invalid-format-${scenario.name}`);
        await figure.getByRole('button', { name: copy.pause, exact: true }).click();
        await page.clock.runFor(5000); await check(0, 1);
        await figure.getByRole('button', { name: copy.resume, exact: true }).click();
        await page.clock.runFor(1800); await check(0, 2);
        await expect(figure.locator('[data-model-state]')).toHaveText(copy.modelStates.idle);
        await capture(figure, `rejected-${scenario.name}`);
        await page.clock.runFor(2300); await check(0, 3);
        await page.clock.runFor(2600); await check(1, 0);
        await page.clock.runFor(1800); await check(1, 1);
        await expect(figure.getByText(copy.validFormat, { exact: true })).toBeVisible();
        expect(JSON.parse(await figure.locator('[data-sequence-json="request"]').innerText())).toEqual({ model: 'example-model', messages: [{ role: 'user', content: copy.inputMessage }] });
        await capture(figure, `valid-format-${scenario.name}`);
        await page.clock.runFor(2600); await check(1, 2);
        await expect(figure.locator('[data-model-state]')).toHaveText(copy.modelStates.running);
        await page.clock.runFor(1800); await check(1, 3);
        await page.clock.runFor(1800); await check(1, 4);
        expect(JSON.parse(await figure.locator('[data-sequence-json="response"]').innerText())).toEqual({ message: { role: 'assistant', content: copy.replyMessage } });
        await capture(figure, `json-response-${scenario.name}`);
        await page.clock.runFor(1800); await check(1, 5);
        await expect(figure.locator('[data-sequence-message]')).toHaveText(copy.replyMessage);
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
        await figure.getByRole('button', { name: copy.playAgain, exact: true }).focus();
        await page.keyboard.press('Enter'); await check(0, 0);
        expect(errors).toEqual([]);
        await test.info().attach('sequence-layout', { body: JSON.stringify({ measurements, errors }, null, 2), contentType: 'application/json' });
      });
    }

    test(`${locale}: both attempts are readable without JavaScript`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
      try {
        const page = await context.newPage();
        await page.goto(lesson);
        const figure = page.getByRole('figure', { name: copy.label });
        await expect(figure.getByText(copy.invalidFormat, { exact: true })).toBeVisible();
        await expect(figure.getByText(copy.validFormat, { exact: true })).toBeVisible();
        await expect(figure.locator('noscript [data-sequence-json="response"]')).toBeVisible();
        await expect(figure.getByRole('button')).toHaveCount(0);
        expect(await figure.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
        await capture(figure, 'no-javascript');
      } finally { await context.close(); }
    });
  }
});
