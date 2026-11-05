import { test, expect } from '@playwright/test';
import { readCatalog } from '../../../../src/lib/content/manifest';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published course overviews.');

for (const scenario of [
  { name: 'desktop', width: 1440, javaScriptEnabled: true },
  { name: 'phone', width: 390, javaScriptEnabled: true },
  { name: 'narrow phone', width: 320, javaScriptEnabled: true },
  { name: 'without JavaScript', width: 390, javaScriptEnabled: false },
]) {
  test(`course directory uses one compact Mac title bar on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 960 },
      javaScriptEnabled: scenario.javaScriptEnabled, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const evidence = [];
      for (const course of readCatalog().courses) {
        await page.goto(course.url);
        if (scenario.javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('main h1')).toHaveText(course.title);
        await expect(page.locator('.course-overview-description')).toHaveText(course.description);
        const header = page.getByRole('banner');
        await expect(header).toHaveCount(1);
        await expect(header).toHaveCSS('height', '56px');
        await expect(header).toHaveCSS('position', 'static');
        await expect(header.locator('.mac-window-heading')).toHaveText(course.title);
        await expect(header.locator('.site-header-inner > a')).toHaveCount(1);
        await expect(header.locator('.site-header-logo [data-slot="brand-mark"]')).toBeVisible();
        await expect(page.getByRole('tablist')).toHaveCount(0);
        const frame = (await page.locator('[data-slot="site-window"]').boundingBox())!;
        const margin = scenario.width <= 721 ? 6 : 12;
        expect(frame.x).toBe(margin);
        expect(frame.width).toBe(scenario.width - 2 * margin);
        expect(frame.y + frame.height).toBe(960 - margin);
        const catalog = page.locator('section[aria-labelledby="course-catalog"]');
        await expect(catalog.locator('ol a')).toHaveCount(course.lessons.length);
        for (const [index, lesson] of course.lessons.entries()) {
          await expect(catalog.locator('ol a').nth(index)).toHaveAttribute('href', lesson.url);
          await expect(catalog.locator('ol a').nth(index)).toContainText(lesson.title);
        }
        if (course.lessons.length) {
          const action = page.locator('[data-slot="hero-primary-action"]');
          await expect(action).toHaveAttribute('href', course.lessons[0].url);
          expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(scenario.width < 721 ? 48 : 44);
        } else await expect(page.locator('[data-slot="course-empty"]')).toBeVisible();
        const disk = page.locator('.course-disk-cover');
        if (scenario.width <= 721) await expect(disk).toBeHidden();
        else await expect(disk).toBeVisible();
        await header.locator('.language-picker summary').click();
        const languages = header.locator('.language-options');
        await expect(languages.locator('a')).toHaveCount(5);
        const menu = (await languages.boundingBox())!;
        expect(menu.x).toBeGreaterThanOrEqual(0);
        expect(menu.x + menu.width).toBeLessThanOrEqual(scenario.width);
        await header.locator('.language-picker summary').click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (course.locale === 'zh') await testInfo.attach(course.slug, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
        evidence.push({ url: course.url, margin, lessons: course.lessons.length });
      }
      await page.goto('/zh/courses/llm-101');
      const directory = page.locator('[data-slot="course-overview-body"]');
      const headerBox = await page.getByRole('banner').boundingBox();
      await directory.locator('footer').scrollIntoViewIfNeeded();
      await expect(directory.locator('footer')).toBeInViewport();
      expect(await directory.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
      expect(await page.getByRole('banner').boundingBox()).toEqual(headerBox);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await page.locator('[data-slot="hero-primary-action"]').click();
      await expect(page).toHaveURL('/zh/courses/llm-101/what-a-language-model-does');
      await page.goBack();
      await expect(page).toHaveURL('/zh/courses/llm-101');
      await page.getByRole('banner').locator('.site-header-logo').click();
      await expect(page).toHaveURL('/zh');
      expect(context.pages()).toHaveLength(1);
      await testInfo.attach('Directory evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    } finally { await context.close(); }
  });
}
