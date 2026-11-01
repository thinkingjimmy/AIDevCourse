import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const path = '/zh/courses/llm-101/what-is-a-token';
const block = '[data-achievement="token-boundaries"]';
const key = 'lac:v1:llm-101:achievement:token-boundaries';
const burst = '[data-achievement-confetti]';

async function expectFramedCaption(card: Locator) {
  const layout = await card.evaluate((element) => {
    const frame = element.getBoundingClientRect();
    const caption = element.querySelector('[data-slot="note-signature"]')!.getBoundingClientRect();
    const body = element.querySelector('[data-slot="alert-description"]')!.getBoundingClientRect();
    return {
      center: caption.top + caption.height / 2, top: frame.top,
      border: parseFloat(getComputedStyle(element).borderTopWidth),
      left: caption.left - frame.left, right: frame.right - caption.right,
      gap: body.top - caption.bottom, fits: element.scrollWidth <= element.clientWidth,
    };
  });
  expect(Math.abs(layout.center - layout.top - layout.border)).toBeLessThan(0.1);
  expect(layout.left).toBeGreaterThan(0);
  expect(layout.right).toBeGreaterThan(0);
  expect(layout.gap).toBeGreaterThanOrEqual(12);
  expect(layout.fits).toBe(true);
}

async function screenshotFrame(page: Page, card: Locator, path?: string) {
  await card.scrollIntoViewIfNeeded();
  const clip = await card.evaluate((element) => {
    const frame = element.getBoundingClientRect();
    const caption = element.querySelector('[data-slot="note-signature"]')!.getBoundingClientRect();
    const x = Math.max(0, frame.left - 8);
    const y = Math.max(0, caption.top - 8);
    return { x, y, width: frame.right + 8 - x, height: frame.bottom + 8 - y };
  });
  return page.screenshot({ path, clip, animations: 'disabled' });
}

async function holdBursts(page: Page) {
  await page.evaluate(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args: Parameters<Element['animate']>) {
      const animation = animate.apply(this, args);
      if (this.matches('[data-confetti-side]')) {
        animation.pause();
        animation.currentTime = 0;
      }
      return animation;
    };
  });
}

async function unlock(page: Page) {
  await page.locator(block).getByRole('radio').nth(1).click();
  await expect(page.locator(block)).toHaveAttribute('data-state', 'unlocked');
}

test.describe('Achievement presentation', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'These achievements belong to the published catalog.');

  for (const scenario of [
    { name: 'desktop', width: 1440, height: 960 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'narrow', width: 320, height: 844 },
    { name: 'enlarged', width: 390, height: 844 },
  ]) {
    test(`footer actions and two-corner confetti on ${scenario.name}`, async ({ page }) => {
      await page.setViewportSize(scenario);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(path);
      if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
      const card = page.locator(block);
      await expect(card.getByRole('radio').first()).toBeEnabled();
      await expectFramedCaption(card);
      await card.getByRole('radio').first().click();
      await expect(card).toHaveAttribute('data-state', 'incorrect');
      await expectFramedCaption(card);
      await expect(page.locator(burst)).toHaveCount(0);
      await holdBursts(page);
      await unlock(page);
      const heading = card.getByRole('heading', { name: '成就已解锁 · 看懂 Token 的边界' });
      const retry = card.getByRole('button', { name: '再试一次', exact: true });
      const viewAll = card.getByRole('button', { name: '查看所有成就', exact: true });
      await expect(heading).toBeFocused();
      await expectFramedCaption(card);
      await expect(retry).toHaveText('再试一次');
      await expect(retry.locator('svg')).toHaveAttribute('width', '20');
      await expect(viewAll).toBeVisible();
      await expect(card.locator('header').getByRole('button')).toHaveCount(0);
      await expect(card.getByRole('button')).toHaveCount(2);
      for (const button of [retry, viewAll]) {
        await expect(button).toHaveCSS('border-top-width', '1px');
        await expect(button).toHaveCSS('border-top-style', 'solid');
      }

      const layout = await card.evaluate((element) => {
        const card = element.getBoundingClientRect();
        const takeaway = element.querySelector('p')!.getBoundingClientRect();
        const buttons = [...element.querySelectorAll('button')].map((button) => {
          const box = button.getBoundingClientRect();
          return { top: box.top, left: box.left, right: box.right, width: box.width, height: box.height };
        });
        return {
          takeawayBottom: takeaway.bottom, cardLeft: card.left, cardRight: card.right, buttons,
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
        };
      });
      for (const button of layout.buttons) {
        expect(button.top).toBeGreaterThanOrEqual(layout.takeawayBottom + 12);
        expect(button.left).toBeGreaterThan(layout.cardLeft);
        expect(button.right).toBeLessThan(layout.cardRight);
        expect(button.width).toBeGreaterThanOrEqual(44);
        expect(button.height).toBeGreaterThanOrEqual(44);
      }
      if (scenario.name === 'desktop') expect(layout.buttons[0].top).toBe(layout.buttons[1].top);
      expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth);

      const layer = page.locator(burst);
      await expect(layer).toHaveCount(1);
      await expect(layer).toHaveAttribute('aria-hidden', 'true');
      await expect(layer).toHaveCSS('pointer-events', 'none');
      const perSide = scenario.width < 640 ? 80 : 120;
      for (const side of ['left', 'right']) await expect(layer.locator(`[data-confetti-side="${side}"]`)).toHaveCount(perSide);
      const flights = await layer.evaluate((element) => [...element.children].map((piece) => {
        const animation = piece.getAnimations()[0];
        const effect = animation.effect as KeyframeEffect;
        const frames = effect.getKeyframes();
        const start = piece as HTMLElement;
        const middle = new DOMMatrix(frames[12].transform as string);
        const end = new DOMMatrix(frames[24].transform as string);
        animation.currentTime = Number(effect.getTiming().delay) + Number(effect.getTiming().duration) * 0.3;
        return {
          side: (piece as HTMLElement).dataset.confettiSide,
          startX: start.offsetLeft, startBottom: start.offsetTop + start.offsetHeight, viewportWidth: innerWidth, viewportHeight: innerHeight,
          rise: middle.m42, horizontal: middle.m41, endY: end.m42,
          startOpacity: Number(frames[0].opacity), endOpacity: Number(frames[24].opacity), duration: effect.getTiming().duration,
          delay: effect.getTiming().delay,
          color: start.style.backgroundColor,
          shape: start.style.borderRadius === '50%' ? 'circle' : parseFloat(start.style.height) > parseFloat(start.style.width) * 1.5 ? 'ribbon' : 'square',
        };
      }));
      expect(new Set(flights.map((flight) => flight.color)).size).toBeGreaterThanOrEqual(8);
      expect(new Set(flights.map((flight) => flight.shape)).size).toBe(3);
      expect(new Set(flights.map((flight) => flight.delay)).size).toBe(3);
      for (const flight of flights) {
        expect(Math.abs(flight.startBottom - flight.viewportHeight)).toBeLessThanOrEqual(1);
        if (flight.side === 'left') {
          expect(flight.startX).toBeLessThan(24);
          expect(flight.horizontal).toBeGreaterThan(0);
        } else {
          expect(flight.startX).toBeGreaterThan(flight.viewportWidth - 36);
          expect(flight.horizontal).toBeLessThan(0);
        }
        expect(flight.rise).toBeLessThan(-100);
        expect(flight.endY).toBeGreaterThan(0);
        expect(flight.startOpacity).toBe(0);
        expect(flight.endOpacity).toBe(0);
      }
      await test.info().attach(`confetti-${scenario.name}`, { body: await page.screenshot(), contentType: 'image/png' });
      await test.info().attach('achievement-layout-and-flight', { body: JSON.stringify({ layout, flights }, null, 2), contentType: 'application/json' });
      await layer.evaluate((element) => element.getAnimations({ subtree: true }).forEach((animation) => animation.play()));
      await expect(layer).toHaveCount(0);
      const accessibility = await new AxeBuilder({ page }).include(block).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await test.info().attach(`earned-card-${scenario.name}`, { body: await screenshotFrame(page, card), contentType: 'image/png' });

      const saved = await page.evaluate((key) => localStorage.getItem(key), key);
      await viewAll.focus();
      await viewAll.press('Enter');
      const dialog = page.getByRole('dialog', { name: '我的成就', exact: true });
      await expect(dialog).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(1);
      await expect(dialog.locator('[data-medal="token-boundaries"][data-medal-course="llm-101"]')).toHaveAttribute('data-earned', 'true');
      await expect(dialog.locator('[data-medal-course="coding-101"]').first()).toBeVisible();
      const galleryAccessibility = await new AxeBuilder({ page }).include('[data-course-achievements]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(galleryAccessibility.violations).toEqual([]);
      await test.info().attach(`inline-achievement-gallery-${scenario.name}`, { body: await page.screenshot(), contentType: 'image/png' });
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(viewAll).toBeFocused();
      expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(saved);

      await retry.focus();
      await retry.press('Enter');
      await expect(card.getByRole('radio').first()).toBeFocused();
      await expectFramedCaption(card);
      await expect(card.locator('input:checked')).toHaveCount(0);
      await card.getByRole('radio').nth(1).focus();
      await page.keyboard.press('Space');
      await expect(layer).toHaveCount(1);
      expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(saved);
      await retry.click();
      await expect(layer).toHaveCount(0);
      await expect(card.getByRole('radio').first()).toBeFocused();
    });
  }

  for (const width of [1440, 320]) {
    test(`saved earned card opens the gallery and follows achievement links at ${width}px`, async ({ page }, testInfo) => {
      const savedKey = 'lac:v1:llm-101:achievement:input-shapes-output';
      const saved = JSON.stringify({ unlockedAt: '2026-10-01T00:00:00Z' });
      await page.setViewportSize({ width, height: 960 });
      await page.addInitScript(({ key, saved }) => localStorage.setItem(key, saved), { key: savedKey, saved });
      await page.goto('/zh/courses/llm-101/what-a-language-model-does');
      const card = page.locator('[data-achievement="input-shapes-output"]');
      await expect(card).toHaveAttribute('data-state', 'unlocked');
      await expect(card.getByRole('heading')).toHaveText('🥇 成就已解锁 · 把需求说清楚');
      await expect(page.locator(burst)).toHaveCount(0);
      await expectFramedCaption(card);
      const takeaway = page.getByRole('note', { name: '划重点', exact: true });
      await expect(takeaway.locator('[data-slot="alert-title"]')).toHaveText('💡 划重点');
      const frameStyle = (element: Element) => {
        const style = getComputedStyle(element);
        const title = getComputedStyle(element.querySelector('[data-slot="note-signature"] > *')!);
        const body = getComputedStyle(element.querySelector('[data-slot="alert-description"]')!);
        return {
          border: style.border, radius: style.borderRadius, shadow: style.boxShadow,
          background: style.backgroundColor, color: style.color,
          padding: style.padding, margin: style.margin,
          title: { size: title.fontSize, weight: title.fontWeight, leading: title.lineHeight, color: title.color },
          body: { size: body.fontSize, leading: body.lineHeight, color: body.color },
        };
      };
      expect(await card.evaluate(frameStyle)).toEqual(await takeaway.evaluate(frameStyle));
      const screenshot = testInfo.outputPath(`earned-card-actions-${width}.png`);
      await screenshotFrame(page, card, screenshot);
      await testInfo.attach('earned-card-actions', { path: screenshot, contentType: 'image/png' });
      const takeawayScreenshot = testInfo.outputPath(`key-takeaway-${width}.png`);
      await screenshotFrame(page, takeaway, takeawayScreenshot);
      await testInfo.attach('key-takeaway', { path: takeawayScreenshot, contentType: 'image/png' });

      const viewAll = card.getByRole('button', { name: '查看所有成就', exact: true });
      const dialog = page.getByRole('dialog', { name: '我的成就', exact: true });
      for (const close of ['button', 'backdrop']) {
        await viewAll.click();
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('[data-medal="input-shapes-output"]')).toHaveAttribute('data-earned', 'true');
        if (close === 'button') await dialog.getByRole('button', { name: '关闭', exact: true }).click();
        else await page.mouse.click(4, 4);
        await expect(dialog).toHaveCount(0);
        await expect(viewAll).toBeFocused();
      }

      await viewAll.click();
      const link = dialog.locator('[data-medal="token-boundaries"]').getByRole('link');
      await link.focus();
      await link.click();
      await expect(page).toHaveURL(/\/what-is-a-token#achievement-token-boundaries$/);
      await expect(dialog).toHaveCount(0);
      await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
      await expect(page.locator(block)).toBeInViewport();
      expect(await page.evaluate((key) => localStorage.getItem(key), savedKey)).toBe(saved);
    });
  }

  test('static challenge keeps its framed caption and explanation without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 844 }, javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto(path);
      const card = page.locator(block);
      await expect(card.locator('[data-slot="note-signature"]')).toHaveText('🥇 成就挑战');
      await expectFramedCaption(card);
      await expect(card.locator('legend')).toBeVisible();
      await card.locator('noscript summary').click();
      await expect(card.locator('noscript details p')).toBeVisible();
      const screenshot = test.info().outputPath('achievement-no-js.png');
      await screenshotFrame(page, card, screenshot);
      await test.info().attach('static-achievement-frame', { path: screenshot, contentType: 'image/png' });
    } finally { await context.close(); }
  });

  test('refresh and tab synchronization stay quiet; leaving the lesson cleans up', async ({ page, context }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(path);
    const other = await context.newPage();
    await other.goto(path);
    await expect(other.locator(block).getByRole('radio').first()).toBeEnabled();
    await page.bringToFront();
    await holdBursts(page);
    await unlock(page);
    await expect(page.locator(burst)).toHaveCount(1);
    await expect(other.locator(block)).toHaveAttribute('data-state', 'unlocked');
    await expect(other.locator(burst)).toHaveCount(0);
    await page.reload();
    await expect(page.locator(block)).toHaveAttribute('data-state', 'unlocked');
    await expect(page.locator(burst)).toHaveCount(0);
    await holdBursts(page);
    await page.locator(block).getByRole('button', { name: '再试一次' }).click();
    await unlock(page);
    await expect(page.locator(burst)).toHaveCount(1);
    await page.locator('article a[href="/zh/courses/llm-101/what-a-language-model-does"]').last().click();
    await expect(page).toHaveURL(/\/what-a-language-model-does$/);
    await expect(page.locator(burst)).toHaveCount(0);
    await other.close();
  });

  test('reduced motion suppresses and cancels celebrations without changing earned records', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await unlock(page);
    await expect(page.locator(burst)).toHaveCount(0);
    expect(await page.locator(block).evaluate((element) => element.getAnimations().length)).toBe(0);
    const saved = await page.evaluate((key) => localStorage.getItem(key), key);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator(burst)).toHaveCount(0);
    await holdBursts(page);
    await page.locator(block).getByRole('button', { name: '再试一次' }).click();
    await unlock(page);
    await expect(page.locator(burst)).toHaveCount(1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator(burst)).toHaveCount(0);
    expect(await page.locator(block).evaluate((element) => element.getAnimations().length)).toBe(0);
    expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(saved);
    await test.info().attach('reduced-motion-earned-card', { body: await screenshotFrame(page, page.locator(block)), contentType: 'image/png' });
  });
});
