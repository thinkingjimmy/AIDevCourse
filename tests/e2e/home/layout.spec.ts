import { test, expect } from '@playwright/test';
import { locales } from '../../../src/lib/i18n/config';
import { localePath } from '../../../src/lib/i18n/routing';

for (const scenario of [
  { name: 'desktop', width: 1440, javaScriptEnabled: true },
  { name: 'phone', width: 390, javaScriptEnabled: true },
  { name: 'narrow phone', width: 320, javaScriptEnabled: true },
  { name: 'without JavaScript', width: 1440, javaScriptEnabled: false },
]) {
  test(`homepage uses an open frame on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({
      baseURL, javaScriptEnabled: scenario.javaScriptEnabled,
      viewport: { width: scenario.width, height: 960 }, reducedMotion: 'reduce',
    });
    try {
      const page = await context.newPage();
      const evidence = [];
      for (const locale of locales) {
        await page.goto(localePath(locale));
        const header = page.locator('header');
        const logo = header.locator('a').first();
        const language = header.locator('.language-picker summary');
        await expect(logo.locator('[data-slot="brand-mark"]')).toBeVisible();
        await expect.poll(() => logo.locator('[data-slot="brand-mark"]').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
        const metrics = await header.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const container = element.firstElementChild!.getBoundingClientRect();
          const frame = getComputedStyle(element.parentElement!, '::before');
          const content = document.querySelector('[data-slot="home-hero"]')!.getBoundingClientRect();
          return { height: box.height, container: { left: container.left, right: container.right },
            sideBorders: [frame.borderLeftWidth, frame.borderRightWidth],
            contentWidth: content.width, overflow: document.documentElement.scrollWidth > innerWidth };
        });
        expect(metrics.height).toBeCloseTo(56 * 1.2, 1);
        expect(metrics.container.left).toBeCloseTo(0, 1);
        expect(metrics.container.right).toBeCloseTo(scenario.width, 1);
        expect(metrics.sideBorders).toEqual(['0px', '0px']);
        expect(metrics.contentWidth).toBeCloseTo(Math.min(1024, scenario.width), 1);
        expect(metrics.overflow).toBe(false);
        await expect(header).toHaveCSS('border-bottom-width', '0px');
        await expect(page.getByRole('contentinfo')).toHaveCSS('border-top-width', '0px');
        await expect(page.locator('main > hr')).toHaveCount(0);
        const padding = scenario.width <= 721 ? 16 : 28;
        const logoBox = (await logo.boundingBox())!;
        const markBox = (await logo.locator('[data-slot="brand-mark"]').boundingBox())!;
        const languageBox = (await language.boundingBox())!;
        expect(markBox.width).toBeCloseTo(44 * 0.8, 1);
        expect(markBox.height).toBeCloseTo(44 * 0.8, 1);
        expect(logoBox.width).toBeGreaterThanOrEqual(44);
        expect(logoBox.height).toBeGreaterThanOrEqual(44);
        expect(logoBox.x).toBeCloseTo(padding, 1);
        expect(scenario.width - languageBox.x - languageBox.width).toBeCloseTo(padding, 1);
        expect(logoBox.x + logoBox.width).toBeLessThan(languageBox.x);
        await language.click();
        const menu = page.locator('.language-options');
        await expect(menu).toBeVisible();
        const menuBox = (await menu.boundingBox())!;
        expect(menuBox.x).toBeGreaterThanOrEqual(0);
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(scenario.width);
        await language.click();
        evidence.push({ locale, ...metrics });
        if (locale === 'zh') {
          const screenshot = testInfo.outputPath('homepage.png');
          await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
          await testInfo.attach('Homepage', { path: screenshot, contentType: 'image/png' });
        }
      }
      await page.goto('/zh');
      await expect(page.locator('header a[href="/zh/about"]')).toHaveCount(0);
      await page.goto('/zh/about');
      await expect(page).toHaveURL(/\/zh\/about$/);
      await expect(page.locator('header')).toHaveCSS('height', '56px');
      await page.locator('header a[href="/zh"]').click();
      await expect(page).toHaveURL(/\/zh$/);
      await expect.poll(async () => (await page.locator('header').boundingBox())!.height).toBeCloseTo(67.2, 1);
      await testInfo.attach('Layout measurements', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    } finally {
      await context.close();
    }
  });
}
