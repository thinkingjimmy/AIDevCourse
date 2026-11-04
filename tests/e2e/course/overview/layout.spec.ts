import { test, expect, type Page } from '@playwright/test';
import { readCatalog } from '../../../../src/lib/content/manifest';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published course overviews.');

async function headerLayout(page: Page) {
  return page.getByRole('banner').evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const container = element.firstElementChild!.getBoundingClientRect();
    const logo = element.querySelector('a')!.getBoundingClientRect();
    const mark = element.querySelector('[data-slot="brand-mark"]')!.getBoundingClientRect();
    const language = element.querySelector('summary')!.getBoundingClientRect();
    return { height: bounds.height, left: container.left, right: container.right,
      logoLeft: logo.left, markSize: [mark.width, mark.height], languageRight: language.right,
      position: getComputedStyle(element).position, border: getComputedStyle(element).borderBottomWidth };
  });
}

async function actionStyle(page: Page) {
  return page.locator('[data-slot="hero-primary-face"]').evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color, radius: style.borderRadius,
      font: style.fontSize, padding: [style.paddingLeft, style.paddingRight] };
  });
}

for (const scenario of [
  { name: 'desktop', width: 1440, javaScriptEnabled: true },
  { name: 'phone', width: 390, javaScriptEnabled: true },
  { name: 'narrow phone', width: 320, javaScriptEnabled: true },
  { name: 'phone without JavaScript', width: 390, javaScriptEnabled: false },
]) {
  test(`course overviews share the homepage frame on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 960 },
      javaScriptEnabled: scenario.javaScriptEnabled, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto('/zh');
      const homeHeader = await headerLayout(page);
      const homeAction = await actionStyle(page);
      const homeSpacing = await page.locator('[data-slot="home-hero"]').evaluate(element => {
        const style = getComputedStyle(element);
        return [style.paddingTop, style.paddingBottom, style.paddingLeft, style.paddingRight];
      });
      const evidence = [];
      for (const course of readCatalog().courses) {
        await page.goto(course.url);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('main h1')).toHaveText(course.title);
        expect(await headerLayout(page)).toEqual(homeHeader);
        await expect(page.getByRole('banner')).toHaveCSS('border-bottom-width', '0px');
        await expect(page.getByRole('contentinfo')).toHaveCSS('border-top-width', '0px');
        await expect(page.locator('main > hr')).toHaveCount(0);
        const layout = await page.locator('[data-slot="course-hero"]').evaluate(element => {
          const style = getComputedStyle(element);
          const frame = getComputedStyle(element.closest('[data-variant="open"]')!, '::before');
          return { width: element.getBoundingClientRect().width,
            spacing: [style.paddingTop, style.paddingBottom, style.paddingLeft, style.paddingRight],
            borders: [frame.borderLeftWidth, frame.borderRightWidth],
            overflow: document.documentElement.scrollWidth > innerWidth };
        });
        expect(layout.spacing).toEqual(homeSpacing);
        expect(layout.width).toBeCloseTo(Math.min(1024, scenario.width), 1);
        expect(layout.borders).toEqual(['0px', '0px']);
        expect(layout.overflow).toBe(false);
        const catalog = page.locator('section[aria-labelledby="course-catalog"]');
        await expect(catalog.locator('ol a')).toHaveCount(course.lessons.length);
        if (course.lessons.length) {
          await expect(catalog.locator('section').first()).toHaveCSS('border-top-width', '1px');
          expect(await actionStyle(page)).toEqual(homeAction);
          const action = (await page.locator('[data-slot="hero-primary-action"]').boundingBox())!;
          expect(action.height).toBeGreaterThanOrEqual(scenario.width < 721 ? 48 : 44);
          if (scenario.width < 721) expect(action.width).toBeCloseTo(scenario.width - 32, 1);
        } else await expect(page.locator('[data-slot="course-empty"]')).toBeVisible();
        await page.getByRole('banner').locator('.language-picker summary').click();
        const languages = page.getByRole('banner').locator('.language-options');
        await expect(languages.locator('a')).toHaveCount(5);
        const menu = (await languages.boundingBox())!;
        expect(menu.x).toBeGreaterThanOrEqual(0);
        expect(menu.x + menu.width).toBeLessThanOrEqual(scenario.width);
        await page.getByRole('banner').locator('.language-picker summary').click();
        if (course.locale === 'zh') {
          const path = testInfo.outputPath(`${course.slug}.png`);
          await page.screenshot({ path, fullPage: true, animations: 'disabled' });
          await testInfo.attach(course.title, { path, contentType: 'image/png' });
        }
        evidence.push({ url: course.url, ...layout });
      }
      await page.goto('/zh/courses/llm-101');
      await page.getByRole('link', { name: '开始第一课', exact: true }).click();
      await expect(page).toHaveURL('/zh/courses/llm-101/what-a-language-model-does');
      expect(context.pages()).toHaveLength(1);
      await expect(page.getByRole('banner')).toHaveCSS('position', 'static');
      await expect(page.getByRole('banner')).toHaveCSS('border-bottom-width', '1px');
      await page.goBack();
      await expect(page).toHaveURL('/zh/courses/llm-101');
      await expect(page.getByRole('banner')).toHaveCSS('position', 'sticky');
      await expect(page.getByRole('banner')).toHaveCSS('border-bottom-width', '0px');
      await testInfo.attach('Overview layout', { body: JSON.stringify({ homeHeader, courses: evidence }, null, 2), contentType: 'application/json' });
    } finally { await context.close(); }
  });
}
