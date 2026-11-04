import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published design course.');

for (const scenario of [
  { name: 'desktop', width: 1440, javaScriptEnabled: true },
  { name: 'phone', width: 390, javaScriptEnabled: true },
  { name: 'narrow phone', width: 320, javaScriptEnabled: true },
  { name: 'without JavaScript', width: 320, javaScriptEnabled: false },
]) {
  test(`design course opens without artwork on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 960 },
      javaScriptEnabled: scenario.javaScriptEnabled, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/zh');
      const beginner = page.getByRole('region', { name: '入门', exact: true });
      await expect(beginner.getByRole('heading', { level: 3 })).toHaveText(['LLM 101', 'Coding 101', '设计 101']);
      const card = beginner.getByRole('link', { name: '设计 101', exact: true });
      await expect(card).toHaveAttribute('href', '/zh/courses/design-101');
      await expect(card).toContainText('入门 · 免费');
      await expect(card.locator('[data-slot="course-card-image"], [data-anatomy], img')).toHaveCount(0);
      await expect(card.locator('[data-slot="course-card-description"]')).toContainText('不需要设计基础');
      await testInfo.attach('Design course card', { body: await card.screenshot(), contentType: 'image/png' });
      await card.focus();
      await card.press('Enter');
      await expect(page).toHaveURL('/zh/courses/design-101');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('设计 101');
      await expect(page.locator('main [data-anatomy], main svg, main img')).toHaveCount(0);
      await expect(page.locator('[data-slot="course-empty"]')).toContainText('内容更新中');
      await expect(page.getByRole('link', { name: '开始第一课', exact: true })).toHaveCount(0);
      const hero = page.locator('[data-slot="course-hero"] > div');
      expect(await hero.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (scenario.javaScriptEnabled) {
        const accessibility = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
      await testInfo.attach('Design course overview', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('设计 101');
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}
