/**
 * [INPUT]: Public pages, isolated fixture lessons, and optional Git-ignored screenshot references.
 * [OUTPUT]: Portable interaction checks and opt-in local visual comparisons.
 * [POS]: Styling acceptance suite; CI runs interactions without local baseline images.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const fixture = process.env.CONTENT_TEST === '1';
const courseSlug = fixture ? 'ai-coding' : 'ai-101';
const lessonPath = (locale = 'zh', slug = 'first-change') => `/${locale}/courses/${courseSlug}/${slug}`;

const languages = ['zh', 'en', 'ja', 'fr', 'es'] as const;
const viewports = [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }];
const dictionary = (locale: string) => JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
test.setTimeout(90000);
test.beforeEach(({ browserName }, testInfo) => {
  test.skip(fixture && testInfo.title.startsWith('appearance:'), 'Local references cover public pages.');
  test.skip(!fixture && ['shared controls', 'reading stays', 'storage and clipboard'].some((title) => testInfo.title.startsWith(title)), 'Lesson controls use the isolated fixture build.');
  test.skip(testInfo.title.startsWith('appearance:') && browserName !== 'chromium', 'Visual references target Chromium; interaction tests run in every browser.');
});

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('h1')).toHaveCount(1);
  const completion = page.locator('.completion-box button');
  if (await completion.count()) await expect(completion).toBeEnabled();
}

async function verifyAppearance(page: Page, name: string[], fullPage = true) {
  await expect(page).toHaveScreenshot(name, { fullPage, maxDiffPixelRatio: 0.001, animations: 'disabled' });
  const path = test.info().outputPath(...name);
  await page.screenshot({ path, fullPage, animations: 'disabled' });
  await test.info().attach(name.join('/'), { path, contentType: 'image/png' });
}

for (const locale of languages) {
  for (const viewport of viewports) {
    test(`appearance: ${locale} ${viewport.name}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize(viewport);
      for (const [surface, path] of Object.entries({
        home: `/${locale}`, about: `/${locale}/about`, course: `/${locale}/courses/ai-101`,
        missing: `/${locale}/missing-style-check`,
      })) {
        await page.goto(path);
        await settle(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${surface} overflows`).toBe(true);
        await verifyAppearance(page, [locale, surface, `${viewport.name}.png`]);
      }
    });
  }
}

for (const viewport of viewports) {
  test(`appearance: design previews ${viewport.name}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(viewport);
    for (const surface of ['index', 'a', 'b', 'c']) {
      await page.goto(surface === 'index' ? '/design' : `/design/${surface}`);
      await settle(page);
      await verifyAppearance(page, ['design', surface, `${viewport.name}.png`]);
    }
  });
}

test('appearance: search and language choices', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize(viewports[0]);
  await page.goto('/zh');
  await page.locator('.language-picker summary').click();
  await verifyAppearance(page, ['controls', 'languages', 'desktop.png'], false);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  const input = page.getByRole('textbox');
  await input.fill('模型');
  await expect(page.locator('.search-result').first()).toBeVisible();
  await verifyAppearance(page, ['controls', 'search', 'desktop.png'], false);
  await page.keyboard.press('Escape');
});

test('shared controls preserve keyboard search, navigation, and completion', async ({ page }) => {
  const copy = dictionary('zh');
  await page.goto('/zh');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Control+k');
  const input = page.getByRole('textbox', { name: copy.Search.open });
  await expect(input).toBeFocused();
  await input.fill('上下文');
  await expect(page.locator('.search-result').first()).toBeVisible();
  await input.dispatchEvent('compositionstart');
  await input.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await input.dispatchEvent('compositionend');
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/zh\/courses\/ai-coding\//);
  await page.goto(lessonPath());
  const complete = page.getByRole('button', { name: copy.Learning.complete, exact: true });
  await expect(complete).toBeEnabled();
  await complete.click();
  await expect(page.getByRole('button', { name: copy.Learning.undo, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: copy.Learning.undo, exact: true })).toBeEnabled();
  await page.locator('.language-picker summary').click();
  await page.locator('.language-options a[hreflang="en"]').click();
  await expect(page).toHaveURL(/\/en\/courses\/ai-coding\/first-change$/);
  await expect(page.getByRole('button', { name: dictionary('en').Learning.undo, exact: true })).toHaveAttribute('aria-pressed', 'true');
  const modules = page.locator('[data-sidebar="menu-button"]');
  if (await modules.first().getAttribute('aria-expanded') !== 'true') await modules.first().click();
  await expect(modules.first()).toHaveAttribute('aria-expanded', 'true');
  await page.locator('[data-sidebar="menu-sub-button"]').first().click();
  await expect(modules.first()).toHaveAttribute('aria-expanded', 'true');
  await page.setViewportSize(viewports[1]);
  const menu = page.getByRole('button', { name: dictionary('en').Ui.menu, exact: true });
  await menu.click();
  await expect(page.locator('[data-mobile="true"] .course-navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-mobile="true"]')).toHaveCount(0);
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-mobile="true"]')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('reading stays usable at responsive boundaries and without JavaScript', async ({ page, browser, baseURL }) => {
  for (const width of [320, 640, 720, 840, 960, 961, 1024, 1100, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(lessonPath());
    await expect(page.locator('article > .prose')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`).toBe(true);
  }
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: viewports[1] });
  const reading = await context.newPage();
  await reading.goto(lessonPath());
  await expect(reading.locator('article > .prose')).toBeVisible();
  await reading.locator('noscript details summary').click();
  await expect(reading.locator('noscript .course-navigation')).toBeVisible();
  await context.close();
});

test('storage and clipboard failures keep reading and feedback usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('Denied')) } });
  });
  const copy = dictionary('zh');
  await page.goto(lessonPath());
  await page.getByRole('button', { name: copy.Learning.complete, exact: true }).click();
  await expect(page.locator('.completion-box')).toContainText(copy.Learning.failure);
  await page.getByRole('button', { name: copy.Ui.copy, exact: true }).first().click();
  await expect(page.locator('.copy-error').first()).toContainText(copy.Ui.copyFailed);
  await expect(page.locator('article > .prose')).toBeVisible();
  const path = test.info().outputPath('feedback', 'storage-and-clipboard.png');
  await page.screenshot({ path, fullPage: true });
  await test.info().attach('Storage and clipboard feedback', { path, contentType: 'image/png' });
});

test('hero illustrations preserve their opening, hover, and callout behavior', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/zh');
  const mac = page.locator('[data-anatomy="mac"]');
  const keyboard = mac.locator('[data-asm="kb"]');
  await expect.poll(() => keyboard.getAttribute('transform')).not.toBeNull();
  await mac.hover();
  await expect.poll(() => keyboard.getAttribute('transform')).toBeNull();
  await page.mouse.move(0, 0);
  await expect.poll(() => keyboard.getAttribute('transform')).not.toBeNull();
  await page.goto(`/zh/courses/${courseSlug}`);
  const chip = page.locator('[data-anatomy="chip"]');
  await expect(chip).toHaveAttribute('data-settled', 'true');
  await chip.hover();
  await expect(chip).toHaveAttribute('data-settled', 'false');
  await page.mouse.move(0, 0);
  await expect(chip).toHaveAttribute('data-settled', 'true');
  await expect(chip.locator('.co').first()).toHaveCSS('opacity', '1');
  const path = test.info().outputPath('illustrations', 'opened-chip.png');
  await page.screenshot({ path });
  await test.info().attach('Opened chip with callouts', { path, contentType: 'image/png' });
});
