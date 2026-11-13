import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { htmlLanguages } from '../../../../src/lib/i18n/config';
import { localePath } from '../../../../src/lib/i18n/routing';
import { capture, expectFits, mockEmbeds } from '../../course/applications/helpers';

const locales = ['zh', 'en', 'ja', 'fr', 'es'] as const;
const interpolate = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key) => String(values[key]));

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published artifact example.');
test.beforeEach(async ({ page }) => { await mockEmbeds(page); });

async function clickControl(control: Locator) {
  await control.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await control.click();
}

for (const locale of locales) {
  const lesson = localePath(locale, '/courses/deepseek-101/ai-chat-tips');
  const messages = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
  const copy = messages.Newton;
  const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }].filter((viewport) => locale === 'zh' || viewport.name === 'desktop')) {
    test(`${locale}: Newton's second law is explicit and interactive on ${viewport.name}`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setViewportSize(viewport);
      await page.clock.install({ time: new Date('2026-11-02T10:00:00Z') });
      await page.clock.pauseAt(new Date('2026-11-02T10:00:01Z'));
      expect((await page.goto(lesson))?.status()).toBe(200);
      const demo = page.getByRole('figure', { name: copy.label });
      await page.clock.runFor(100);
      await expect(demo).toHaveAttribute('data-ready', 'true');
      await demo.scrollIntoViewIfNeeded();
      await expect(demo.locator('figcaption')).toContainText(copy.title);
      await expect(demo.getByText('F = ma', { exact: true })).toBeVisible();
      const force = demo.getByRole('slider', { name: copy.force });
      const mass = demo.getByRole('slider', { name: copy.mass });
      const acceleration = demo.locator('[data-newton-acceleration]');
      await expect(force).toHaveValue('4');
      await expect(mass).toHaveValue('2');
      await expect(acceleration).toHaveText('2 m/s²');
      await expect(demo).toHaveAttribute('data-state', 'ready');
      await expect(demo).toHaveAttribute('lang', htmlLanguages[locale]);
      const headingOrder = await demo.evaluate((element) => {
        const headings = [...element.closest('article')!.querySelectorAll('h2')];
        return headings.filter((heading) => heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING).at(-1)?.textContent;
      });
      expect(headingOrder).toContain('Artifact');

      const samples = [];
      for (const sample of [
        { force: 8, mass: 2, acceleration: '4 m/s²', insight: copy.insights.doubleForce },
        { force: 4, mass: 4, acceleration: '1 m/s²', insight: copy.insights.doubleMass },
        { force: 8, mass: 4, acceleration: '2 m/s²', insight: copy.insights.sameRatio },
        { force: 0, mass: 2, acceleration: '0 m/s²', insight: copy.insights.zero },
        { force: 1, mass: 3, acceleration: `${number(1 / 3)} m/s²`, insight: copy.insights.other },
        { force: 8, mass: 1, acceleration: '8 m/s²', insight: copy.insights.other },
      ]) {
        await force.fill(String(sample.force));
        await mass.fill(String(sample.mass));
        await expect(acceleration).toHaveText(sample.acceleration);
        await expect(demo.locator('[data-newton-insight]')).toHaveText(interpolate(sample.insight, { acceleration: number(sample.force / sample.mass), ratio: number(sample.force / sample.mass / 2) }));
        await expect(force).toHaveAttribute('aria-valuetext', interpolate(copy.forceValue, { force: sample.force }));
        await expect(mass).toHaveAttribute('aria-valuetext', interpolate(copy.massValue, { mass: sample.mass }));
        if (sample.force === 1 && sample.mass === 3) await expect(demo.locator('[data-newton-equation]')).toContainText('≈');
        samples.push({ ...sample, equation: await demo.locator('[data-newton-equation]').innerText() });
      }
      await force.press('Home');
      await expect(force).toHaveValue('0');
      await force.press('End');
      await expect(force).toHaveValue('8');
      await force.press('ArrowLeft');
      await expect(force).toHaveValue('7');
      await mass.press('Home');
      await expect(mass).toHaveValue('1');
      await mass.press('End');
      await expect(mass).toHaveValue('4');
      await clickControl(demo.getByRole('button', { name: copy.reset, exact: true }));
      await expect(force).toHaveValue('4');
      await expect(mass).toHaveValue('2');

      await force.fill('8');
      await clickControl(demo.getByRole('button', { name: copy.start, exact: true }));
      await page.clock.runFor(500);
      await expect(demo).toHaveAttribute('data-state', 'playing');
      const cart = demo.locator('[data-newton-cart="current"]');
      const reference = demo.locator('[data-newton-cart="reference"]');
      expect(Number(await cart.getAttribute('x'))).toBeGreaterThan(Number(await reference.getAttribute('x')));
      await clickControl(demo.getByRole('button', { name: copy.pause, exact: true }));
      const paused = await demo.getAttribute('data-time');
      await page.clock.runFor(1000);
      await expect(demo).toHaveAttribute('data-time', paused!);
      await clickControl(demo.getByRole('button', { name: copy.resume, exact: true }));
      await page.clock.runFor(2200);
      await expect(demo).toHaveAttribute('data-state', 'complete');
      await expect(demo).toHaveAttribute('data-time', '2.000');
      await expect(cart).toHaveAttribute('x', '240');
      await expect(reference).toHaveAttribute('x', '136');
      await expect(demo.locator('[data-newton-speed="current"]')).toHaveText('8 m/s');
      await expect(demo.locator('[data-newton-speed="reference"]')).toHaveText('4 m/s');
      await capture(demo, `newton-${viewport.name}`);

      await clickControl(demo.getByRole('button', { name: copy.playAgain, exact: true }));
      await page.clock.runFor(200);
      await page.locator('[data-slot="lesson-completion"]').scrollIntoViewIfNeeded();
      await expect(demo).not.toBeInViewport();
      await page.clock.runFor(100);
      await expect(demo).toHaveAttribute('data-state', 'paused');
      const offscreen = await demo.getAttribute('data-time');
      await page.clock.runFor(1000);
      await expect(demo).toHaveAttribute('data-time', offscreen!);
      await demo.scrollIntoViewIfNeeded();
      await mass.fill('4');
      await expect(demo).toHaveAttribute('data-state', 'ready');
      await expect(cart).toHaveAttribute('x', '32');
      await expect(reference).toHaveAttribute('x', '32');
      await page.clock.runFor(500);
      await expect(demo).toHaveAttribute('data-time', '0.000');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      await page.clock.resume();
      const accessibility = await new AxeBuilder({ page }).include('[data-newton-demo]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await testInfo.attach(`newton-measurements-${viewport.name}`, { body: JSON.stringify({ samples, errors, accessibilityViolations: accessibility.violations }, null, 2), contentType: 'application/json' });
    });
  }

  test(`${locale}: Newton's second law respects reduced motion and enlarged narrow layouts`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(lesson);
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
    const demo = page.getByRole('figure', { name: copy.label });
    await expect(demo).toHaveAttribute('data-ready', 'true');
    await clickControl(demo.getByRole('button', { name: copy.start, exact: true }));
    await expect(demo).toHaveAttribute('data-state', 'complete');
    await expect(demo).toHaveAttribute('data-time', '2.000');
    await expect(demo.getByRole('status')).toHaveText(interpolate(copy.status.complete, { speed: 4 }));
    await demo.getByRole('slider', { name: copy.force }).fill('0');
    await clickControl(demo.getByRole('button', { name: copy.start, exact: true }));
    await expect(demo.locator('[data-newton-cart="current"]')).toHaveAttribute('x', '32');
    await expect(demo.locator('[data-newton-speed="current"]')).toHaveText('0 m/s');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const geometry = await expectFits(demo);
    await testInfo.attach('newton-narrow-geometry', { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
    await capture(demo, 'newton-narrow-enlarged');
  });

  test(`${locale}: Newton's second law retains its explanation without JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 844 }, javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await mockEmbeds(page);
      expect((await page.goto(lesson))?.status()).toBe(200);
      const demo = page.getByRole('figure', { name: copy.label });
      await expect(demo.getByText('F = ma', { exact: true })).toBeVisible();
      await expect(demo.locator('[data-newton-acceleration]')).toHaveText('2 m/s²');
      await expect(demo.getByRole('slider').first()).not.toBeVisible();
      await expect(demo.getByText(copy.static, { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await capture(demo, 'newton-no-javascript');
    } finally { await context.close(); }
  });
}
