import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const copy = (locale: string) => JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
const pages = [
  { path: '/zh', locale: 'zh', status: 200 },
  { path: '/zh/courses/getting-started', locale: 'zh', status: 200 },
  { path: '/zh/courses/getting-started/about-this-course', locale: 'zh', status: 200 },
  { path: '/zh/about', locale: 'zh', status: 200 },
  { path: '/zh/missing-author-page', locale: 'zh', status: 404 },
  { path: '/unsupported-locale', locale: 'en', status: 404 },
];

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published introduction lesson.');

for (const width of [1440, 320]) {
  test(`header author entry works across page types at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const evidence = [];
    for (const entry of pages) {
      const response = await page.goto(entry.path);
      expect(response?.status()).toBe(entry.status);
      const messages = copy(entry.locale);
      const header = page.getByRole('banner');
      const trigger = header.getByRole('button', { name: messages.Author.label, exact: true });
      await expect(trigger).toHaveText(entry.path === '/zh' ? messages.Author.about : '👋');
      await expect(header.getByRole('link', { name: messages.Ui.about, exact: true })).toHaveCount(0);
      await expect(page.locator('[data-slot="sidebar-footer"] [data-slot="author-dialog-trigger"]')).toHaveCount(0);
      const box = (await trigger.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      await trigger.focus();
      await trigger.press('Enter');
      const dialog = page.getByRole('dialog', { name: messages.Author.label, exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('link', { name: messages.Author.website, exact: true })).toHaveAttribute('href', 'https://jimmywong.dev');
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      evidence.push({ ...entry, trigger: box });
      if (entry.path === '/zh' || entry.path.endsWith('/about-this-course')) {
        await testInfo.attach(entry.path, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
      }
    }
    expect(errors).toEqual([]);
    await testInfo.attach('Header author controls', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  });
}

test('header author fallback works without JavaScript on home, lesson, and missing pages', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 844 } });
  try {
    const page = await context.newPage();
    for (const entry of [pages[0], pages[2], pages[5]]) {
      await page.goto(entry.path);
      const messages = copy(entry.locale);
      const header = page.getByRole('banner');
      await expect(header.locator('[data-slot="author-dialog-trigger"]')).toBeHidden();
      const website = header.getByRole('link', { name: messages.Author.website, exact: true });
      await expect(website).toBeVisible();
      await expect(website).toHaveText(entry.path === '/zh' ? messages.Author.about : '👋');
      await expect(website).toHaveAttribute('href', 'https://jimmywong.dev');
      await expect(website).toHaveAttribute('target', '_blank');
      await expect(website).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(page.locator('[data-author-dialog]')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach(entry.path, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
  } finally { await context.close(); }
});
