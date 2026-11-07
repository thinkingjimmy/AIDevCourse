import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { readCatalog } from '../../../src/lib/content/manifest';

const lesson = '/zh/courses/llm-101/how-language-models-are-trained';
const navigationSelector = '[data-slot="mobile-course-navigation"]';
test.skip(process.env.CONTENT_TEST === '1', 'Uses the published mobile learning shell.');

async function capture(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

for (const width of [320, 390]) {
  test(`mobile navigation opens all four destinations at ${width}px`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: { width, height: 844 }, hasTouch: true });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(lesson);
      const navigation = page.locator(navigationSelector);
      await expect(navigation).toBeVisible();
      await expect(navigation.locator('.mobile-navigation-glass')).not.toHaveCSS('background-image', 'none');
      await expect(navigation.locator(':scope > a, :scope > button')).toHaveCount(4);
      await expect(page.locator('[data-slot="mobile-course-header"]')).toHaveCount(0);
      const geometry = await navigation.locator(':scope > a, :scope > button').evaluateAll((controls) => controls.map((control) => {
        const { x, y, width, height } = control.getBoundingClientRect();
        return { label: control.getAttribute('aria-label'), x, y, width, height };
      }));
      expect(geometry.every((control) => control.width >= 44 && control.height >= 44)).toBe(true);
      const pane = page.locator('[data-slot="lesson-region"]');
      await pane.evaluate(element => element.scrollTo(0, 480));
      await capture(page, `glass-navigation-reading-${width}`);
      const accessibility = await new AxeBuilder({ page }).include(navigationSelector).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);

      const contents = navigation.getByRole('button', { name: '课程目录', exact: true });
      await contents.tap();
      const sheet = page.getByRole('dialog', { name: '课程目录', exact: true });
      await expect(sheet).toHaveAttribute('data-side', 'bottom');
      await expect(sheet.locator('a[aria-current="page"]')).toContainText('模型是如何预训练的？');
      await expect(sheet.getByRole('button', { name: '关闭', exact: true })).toBeInViewport();
      await capture(page, `glass-navigation-contents-${width}`);
      await sheet.getByRole('button', { name: '关闭', exact: true }).tap();
      await expect(sheet).toHaveCount(0);
      await expect(contents).toBeFocused();

      const achievements = navigation.getByRole('button', { name: '我的成就', exact: true });
      await achievements.tap();
      const gallery = page.locator('[data-course-achievements]');
      await expect(gallery).toBeVisible();
      await expect(gallery.locator('[data-medal]').first()).toBeVisible();
      await capture(page, `glass-navigation-achievements-${width}`);
      await gallery.getByRole('button', { name: '关闭', exact: true }).tap();
      await expect(achievements).toBeFocused();

      const author = navigation.locator('[data-slot="mobile-author-trigger"]');
      await author.tap();
      const authorDialog = page.locator('[data-author-dialog]');
      await expect(authorDialog).toBeVisible();
      await expect(authorDialog.locator('[data-slot="author-card"]')).toBeVisible();
      await capture(page, `glass-navigation-author-${width}`);
      await page.keyboard.press('Escape');
      await expect(author).toBeFocused();

      await pane.evaluate(element => element.scrollTo(0, element.scrollHeight));
      const articleEnd = await page.locator('article').evaluate((element) => element.getBoundingClientRect().bottom);
      expect(articleEnd).toBeLessThan((await navigation.boundingBox())!.y);
      await capture(page, `glass-navigation-article-end-${width}`);
      await navigation.getByRole('link', { name: '首页', exact: true }).tap();
      await expect(page).toHaveURL('/zh');
      expect(errors).toEqual([]);
      await testInfo.attach('Navigation touch targets', { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
    } finally { await context.close(); }
  });
}

test('mobile navigation fits all five languages with enlarged text and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  const catalog = readCatalog();
  for (const locale of ['zh', 'en', 'ja', 'fr', 'es']) {
    const copy = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
    const course = catalog.courses.find((course) => course.locale === locale && course.lessons.length)!;
    await page.goto(course.lessons[0].url);
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
    const navigation = page.locator(navigationSelector);
    const controls = navigation.locator(':scope > a, :scope > button');
    await expect(controls).toHaveCount(4);
    await expect(navigation.getByRole('button', { name: copy.Course.achievementsTitle, exact: true })).toBeEnabled();
    const geometry = await controls.evaluateAll((items) => items.map((item) => {
      const box = item.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width, height: box.height };
    }));
    expect(geometry.every((item) => item.left >= 0 && item.right <= 320 && item.width >= 44 && item.height >= 44)).toBe(true);
    const labelsFit = await controls.locator('> span:last-child').evaluateAll((labels) => labels.every((label) => label.scrollWidth <= label.clientWidth));
    expect(labelsFit).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await capture(page, `glass-navigation-${locale}-large-text`);
    await navigation.getByRole('button', { name: copy.Ui.menu, exact: true }).click();
    const sheet = page.locator('[data-mobile="true"]');
    await expect(sheet.getByRole('button', { name: copy.Ui.close, exact: true })).toBeInViewport();
    const targets = await sheet.locator('[data-sidebar="menu-button"], [data-sidebar="menu-sub-button"]').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
    expect(targets.every((height) => height >= 48)).toBe(true);
    await page.keyboard.press('Escape');
  }
});

test('mobile glass respects reduced transparency and increased contrast', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP supplies reduced-transparency media emulation.');
  await page.setViewportSize({ width: 390, height: 844 });
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', { features: [
    { name: 'prefers-reduced-transparency', value: 'reduce' },
    { name: 'prefers-contrast', value: 'more' },
  ] });
  await page.goto(lesson);
  const glass = page.locator('.mobile-navigation-glass');
  await expect(glass).toHaveCSS('backdrop-filter', 'none');
  await expect(glass).toHaveCSS('background-color', 'rgb(253, 253, 252)');
  await expect(glass).toHaveCSS('outline-style', 'solid');
  await capture(page, 'glass-navigation-reduced-transparency');
  await session.detach();
});
