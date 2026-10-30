import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const path = '/zh/courses/llm-101/what-is-a-token';
const block = '[data-achievement="token-boundaries"]';
const key = 'lac:v1:llm-101:achievement:token-boundaries';
const burst = '[data-achievement-confetti]';

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
    test(`header retry and two-corner confetti on ${scenario.name}`, async ({ page }) => {
      await page.setViewportSize(scenario);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(path);
      if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
      const card = page.locator(block);
      await card.getByRole('radio').first().click();
      await expect(card).toHaveAttribute('data-state', 'incorrect');
      await expect(page.locator(burst)).toHaveCount(0);
      await holdBursts(page);
      await unlock(page);
      const heading = card.getByRole('heading', { name: '成就已解锁 · 看懂 Token 的边界' });
      const retry = card.getByRole('button', { name: '再试一次', exact: true });
      await expect(heading).toBeFocused();
      await expect(retry).toHaveAttribute('title', '再试一次');
      await expect(retry).toHaveText('');
      await expect(retry.locator('svg')).toHaveAttribute('width', '20');
      await expect(card.locator('header').getByRole('button')).toHaveCount(1);
      await expect(card.getByRole('button')).toHaveCount(1);

      const layout = await retry.evaluate((element) => {
        const button = element.getBoundingClientRect();
        const header = element.parentElement!.getBoundingClientRect();
        const heading = element.parentElement!.querySelector('h3')!.getBoundingClientRect();
        const hitArea = getComputedStyle(element, '::before');
        return {
          rightGap: header.right - button.right,
          firstLineCenterDelta: Math.abs(button.y + button.height / 2 - heading.y - parseFloat(getComputedStyle(element.parentElement!.querySelector('h3')!).lineHeight) / 2),
          headingRight: heading.right,
          buttonLeft: button.left,
          hitWidth: button.width - parseFloat(hitArea.left) - parseFloat(hitArea.right),
          hitHeight: button.height - parseFloat(hitArea.top) - parseFloat(hitArea.bottom),
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
        };
      });
      expect(layout.rightGap).toBeLessThanOrEqual(1);
      expect(layout.firstLineCenterDelta).toBeLessThanOrEqual(7);
      expect(layout.headingRight).toBeLessThan(layout.buttonLeft);
      expect(layout.hitWidth).toBeGreaterThanOrEqual(44);
      expect(layout.hitHeight).toBeGreaterThanOrEqual(44);
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
      await test.info().attach(`earned-card-${scenario.name}`, { body: await card.screenshot(), contentType: 'image/png' });

      const saved = await page.evaluate((key) => localStorage.getItem(key), key);
      await retry.focus();
      await retry.press('Enter');
      await expect(card.getByRole('radio').first()).toBeFocused();
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
    await test.info().attach('reduced-motion-earned-card', { body: await page.locator(block).screenshot(), contentType: 'image/png' });
  });
});
