import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { verifyConnection } from './connections';

const lesson = '/zh/courses/llm-101/what-a-language-model-does';
const id = 'next-character-credits';
const anchorSelector = `[data-jimmy-note-anchor="${id}"]`;
const cardSelector = `[data-jimmy-note-card="${id}"]`;
const triggerSelector = `[data-note-trigger-for="${id}"]`;
const credit = 'https://github.com/helloianneo/ian-xiaohei-illustrations';

async function imageReady(page: Page) {
  const image = page.locator(anchorSelector).getByRole('img');
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate(element => {
    const image = element as HTMLImageElement;
    return image.complete && image.naturalWidth > 0;
  })).toBe(true);
  expect(decodeURIComponent(await image.getAttribute('src') ?? '')).toMatch(/\/next-character(?:\.[a-zA-Z0-9_-]+)?\.webp(?:[?&]|$)/);
  await expect(image).toHaveAttribute('alt', /本次选出并输出「今」/);
  return image;
}

async function capture(page: Page, name: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

async function verifyRuntime(errors: string[]) {
  // Native deferred ResizeObserver delivery can occur while the popover settles.
  const deferredResize = 'ResizeObserver loop completed with undelivered notifications.';
  if (errors.includes(deferredResize)) {
    await test.info().attach('browser-resize-notifications', { body: JSON.stringify(errors, null, 2), contentType: 'application/json' });
  }
  expect(errors.filter(message => message !== deferredResize)).toEqual([]);
}

test.describe('JimmyNote image anchors', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'Uses the published illustration.');

  test('connects the midpoint of the image right edge to its credit in the desktop rail', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 1536, height: 960 });
    await page.goto(lesson);
    const image = await imageReady(page);
    const anchor = page.locator(anchorSelector);
    const card = page.locator(cardSelector);
    await expect(card).toBeVisible();
    await expect(page.locator(triggerSelector)).toBeHidden();
    await expect(card.getByRole('link', { name: 'ian-xiaohei-illustrations', exact: true })).toHaveAttribute('href', credit);
    await expect(card.locator('[data-slot="note-body"]')).toContainText('感谢');
    await expect(anchor).toHaveCSS('background-image', 'none');
    await expect.poll(async () => {
      const imageBounds = (await image.boundingBox())!;
      const anchorBounds = (await anchor.boundingBox())!;
      return Math.abs(imageBounds.y - anchorBounds.y) + Math.abs(imageBounds.height - anchorBounds.height);
    }).toBeLessThan(1);
    const geometry = await verifyConnection(card);
    const accessibility = await new AxeBuilder({ page }).include('[data-note-image]').include(cardSelector).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await verifyRuntime(errors);
    await capture(page, 'image-note-desktop');
    await test.info().attach('image-note-connector', { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(triggerSelector)).toBeVisible();
    await page.locator(triggerSelector).click();
    await expect(page.getByRole('dialog', { name: 'Jimmy 的批注', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1536, height: 960 });
    await expect(card).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Jimmy 的批注', exact: true })).toHaveCount(0);
  });

  for (const scenario of [
    { name: 'mobile', width: 390, height: 844, fontSize: 16 },
    { name: 'narrow', width: 320, height: 844, fontSize: 16 },
    { name: 'enlarged', width: 390, height: 844, fontSize: 24 },
    { name: 'short', width: 390, height: 360, fontSize: 16 },
  ]) {
    test(`opens the image credit with the keyboard on ${scenario.name}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize(scenario);
      await page.goto(lesson);
      await page.evaluate(async size => {
        document.documentElement.style.fontSize = `${size}px`;
        await document.fonts.ready;
      }, scenario.fontSize);
      await imageReady(page);
      const trigger = page.locator(triggerSelector);
      await expect(trigger).toBeEnabled();
      const hit = await trigger.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const before = getComputedStyle(element, '::before');
        return { width: bounds.width - parseFloat(before.left) - parseFloat(before.right), height: bounds.height - parseFloat(before.top) - parseFloat(before.bottom) };
      });
      expect(hit.width).toBeGreaterThanOrEqual(44);
      expect(hit.height).toBeGreaterThanOrEqual(44);
      await trigger.focus();
      await trigger.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Jimmy 的批注', exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('link', { name: 'ian-xiaohei-illustrations', exact: true })).toHaveAttribute('href', credit);
      const bounds = (await dialog.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(15);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(scenario.width - 15);
      expect(bounds.y).toBeGreaterThanOrEqual(15);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(scenario.height - 15);
      const accessibility = await new AxeBuilder({ page }).include('[data-note-image]').include('[data-slot="jimmy-note-popover"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await verifyRuntime(errors);
      await capture(page, `image-note-${scenario.name}`);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });
  }

  test('opens the image credit by touch', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      await page.goto(lesson);
      await imageReady(page);
      await page.locator(triggerSelector).tap();
      const dialog = page.getByRole('dialog', { name: 'Jimmy 的批注', exact: true });
      await expect(dialog.getByRole('link', { name: 'ian-xiaohei-illustrations', exact: true })).toBeVisible();
      await capture(page, 'image-note-touch');
      await page.touchscreen.tap(4, 4);
      await expect(dialog).toHaveCount(0);
    } finally { await context.close(); }
  });

  test('keeps the image and credit readable without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      await page.goto(lesson);
      await imageReady(page);
      await expect(page.locator(triggerSelector)).toBeHidden();
      const note = page.locator('noscript [data-component="jimmy-note"]').filter({ has: page.locator(`a[href="${credit}"]`) });
      await expect(note).toBeVisible();
      await expect(note).toContainText('感谢');
      await note.scrollIntoViewIfNeeded();
      await capture(page, 'image-note-no-js');
    } finally { await context.close(); }
  });
});
