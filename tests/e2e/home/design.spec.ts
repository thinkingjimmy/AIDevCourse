import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published design course.');

const course = '/zh/courses/design-101';
const lesson = `${course}/about-this-course`;

for (const scenario of [
  { name: 'desktop', width: 1440, javaScriptEnabled: true },
  { name: 'phone', width: 390, javaScriptEnabled: true },
  { name: 'narrow phone', width: 320, javaScriptEnabled: true },
  { name: 'without JavaScript', width: 320, javaScriptEnabled: false },
]) {
  test(`design course keeps its disk and opens its introduction on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 960 },
      javaScriptEnabled: scenario.javaScriptEnabled, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/zh');
      const courses = page.getByRole('region', { name: '入门', exact: true });
      const card = courses.getByRole('link', { name: '设计 101', exact: true });
      await expect(card).toHaveAttribute('href', course);
      await expect(card.locator('.disk-level')).toHaveText('入门');
      await expect(card).toContainText('1 课');
      await expect(card.locator('[data-slot="course-card-image"], [data-anatomy], img')).toHaveCount(0);
      await expect(card).toHaveAccessibleDescription(/不需要设计基础/);
      await testInfo.attach('Design course card', { body: await card.screenshot(), contentType: 'image/png' });
      await card.focus();
      await card.press('Enter');
      await expect(page).toHaveURL(course);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('设计 101');
      await expect(page.locator('main [data-anatomy], main [data-slot="course-card-image"], main img')).toHaveCount(0);
      await expect(page.locator('[data-slot="course-empty"]')).toHaveCount(0);
      const entries = page.locator('section[aria-labelledby="course-catalog"] li a');
      await expect(entries).toHaveCount(1);
      await expect(entries.first()).toContainText('1.1关于本课程');
      await expect(entries.first()).toHaveAttribute('href', lesson);
      await expect(page.locator('main')).toContainText('入门');
      await expect(page.locator('main')).toContainText('1 课');
      const start = page.getByRole('link', { name: '开始第一课', exact: true });
      await expect(start).toHaveAttribute('href', lesson);
      await expect(page.locator('.course-disk-cover .disk-title')).toHaveText('设计 101');
      await expect(page.locator('.course-disk-cover [data-slot="course-update-stamp"]')).toHaveText('更新中');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (scenario.javaScriptEnabled) {
        const accessibility = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
      await testInfo.attach('Design course overview', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });

      await start.click();
      await expect(page).toHaveURL(lesson);
      await expect(page.locator('article h1')).toHaveText('关于本课程');
      await expect(page.locator('article > .prose')).toContainText('设计判断力');
      if (scenario.javaScriptEnabled) {
        const accessibility = await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
      await page.goto(course);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('设计 101');
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('设计 101');
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}
