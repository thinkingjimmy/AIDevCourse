/**
 * [INPUT]: Isolated five-language production fixture build.
 * [OUTPUT]: Cross-language learning, reset/tab sync, search, and layout acceptance evidence.
 * [POS]: Nonpublic engineering matrix; never runs fixtures in the deployment build.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { locales, type Locale } from '../../src/lib/i18n/config';
test.skip(process.env.CONTENT_TEST !== '1', 'Requires the isolated nonpublic fixture build.');
const path = (locale: string, slug = 'first-change') => `/${locale}/courses/ai-coding/${slug}`;
const dictionary = (locale: Locale) => JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
test('shares completion across translations and synchronizes reset between tabs', async ({ page, context }) => {
  await page.goto(path('zh'));
  const complete = page.getByRole('button', { name: '标记为已完成', exact: true });
  await expect(complete).toBeEnabled(); await complete.focus(); await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: '取消完成标记', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await expect(page.getByRole('button', { name: '取消完成标记', exact: true })).toBeEnabled();
  await page.goto(path('zh', 'useful-context'));
  const second = page.getByRole('button', { name: '标记为已完成', exact: true });
  await expect(second).toBeEnabled(); await second.click();
  await expect(page.getByRole('button', { name: '取消完成标记', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const other = await context.newPage(); await other.goto(path('en'));
  await expect(other.getByRole('button', { name: 'Mark as incomplete', exact: true })).toBeEnabled();
  await other.goto(path('en', 'useful-context'));
  await expect(other.getByRole('button', { name: 'Mark as incomplete', exact: true })).toBeEnabled();
  await other.goto('/en/courses/ai-coding');
  await expect(other.getByRole('link', { name: 'Review this course' })).toBeVisible();
  await other.getByRole('button', { name: 'Reset course progress' }).click();
  await other.keyboard.press('Escape');
  await expect(other.getByRole('button', { name: 'Reset course progress' })).toBeFocused();
  await expect(other.getByRole('link', { name: 'Review this course' })).toBeVisible();
  await other.getByRole('button', { name: 'Reset course progress' }).click();
  await other.getByRole('button', { name: 'Reset this course', exact: true }).click();
  await expect(page.getByRole('button', { name: '标记为已完成', exact: true })).toHaveAttribute('aria-pressed', 'false');
});
test('explains missing translations and keeps direct access a real 404', async ({ page, request }) => {
  await page.goto(path('zh', 'verify-results'));
  await page.locator('.language-picker summary').click();
  const english = page.locator('.language-options a[href="/en/courses/ai-coding"]');
  await expect(english).toContainText('此课暂无译文'); await english.click();
  await expect(page).toHaveURL(/\/en\/courses\/ai-coding$/);
  const missing = await request.get(path('en', 'verify-results'));
  expect(missing.status()).toBe(404); expect(await missing.text()).not.toContain('WITHDRAWN_SECRET');
  for (const lang of locales) {
    const body = await (await request.get(`/api/search/${lang}`)).text();
    expect(body).not.toContain('WITHDRAWN_SECRET'); expect(body).not.toContain('DRAFT_TRANSLATION_SECRET');
  }
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).not.toContain('/en/courses/ai-coding/foundations/verify-results');
  await page.goto(path('fr'));
  const alternates = await page.locator('link[rel="alternate"]').evaluateAll((links) => links.map((link) => link.getAttribute('hreflang')));
  expect(alternates).toEqual(expect.arrayContaining(['en', 'zh-Hans', 'ja', 'fr', 'es', 'x-default']));
  await expect(page.locator('.notice')).toContainText('dernière version originale');
});
test('blocked storage and failed clipboard do not prevent reading', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('Denied')) } });
  });
  await page.goto(path('zh'));
  await expect(page.locator('article > .prose')).toContainText('上下文');
  await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
  await expect(page.locator('.completion-box')).toContainText('可能无法保存');
  await page.getByRole('button', { name: '复制代码', exact: true }).click();
  await expect(page.locator('.copy-error')).toContainText('复制失败');
});
test('failed images preserve their reading space and descriptive alternative', async ({ page }) => {
  await page.route('**/*change-cycle*', (route) => route.abort());
  await page.goto(path('zh'));
  const picture = page.locator('article img').first();
  await expect(picture).toHaveAttribute('alt', /\S+/);
  await expect(picture).toHaveAttribute('width', '1200');
  await expect(picture).toHaveAttribute('height', '320');
  expect((await picture.boundingBox())?.height).toBeGreaterThan(0);
  await expect(page.locator('article > .prose')).toBeVisible();
});
const queries: Record<Locale, string[]> = { en: ['context', 'verify code', 'prompt'], zh: ['上下文', '检查代码', 'AI coding'], ja: ['コンテキスト', 'コードの確認', 'プロンプト'], fr: ['contexte', 'vérifier', 'verifier'], es: ['contexto', 'código', 'codigo'] };
for (const locale of locales) {
  test(`${locale}: isolated search, valid anchors, keyboard, and IME`, async ({ page }) => {
    const t = dictionary(locale);
    const indexes: string[] = [];
    page.on('request', (request) => { if (request.url().includes('/api/search/')) indexes.push(request.url()); });
    await page.goto(path(locale));
    expect(indexes).toHaveLength(0);
    await page.getByRole('button', { name: t.Search.open, exact: true }).click();
    const input = page.getByRole('textbox', { name: t.Search.open });
    for (const query of queries[locale]) {
      await input.fill(query);
      await expect(page.locator('.search-result').first()).toBeVisible();
      const urls = await page.locator('.search-result').evaluateAll((links) => links.slice(0, 5).map((link) => link.getAttribute('href')));
      expect(urls.some((url) => url?.includes('/ai-coding/first-change'))).toBe(true);
      expect(urls.every((url) => url?.startsWith(`/${locale}/courses/`))).toBe(true);
    }
    expect(indexes.every((url) => url.includes(`/api/search/${locale}?`))).toBe(true);
    await input.dispatchEvent('compositionstart');
    await input.press('Enter'); await expect(page.getByRole('dialog')).toBeVisible();
    await input.dispatchEvent('compositionend');
    await input.press('ArrowDown'); await input.press('Enter');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    const hash = new URL(page.url()).hash;
    if (hash) expect(await page.locator(`[id="${decodeURIComponent(hash.slice(1))}"]`).count()).toBe(1);
  });
  test(`${locale}: five viewports, 200% equivalent zoom, and accessible reading`, async ({ page, browser, baseURL }, testInfo) => {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await page.goto(path(locale));
      await expect(page.locator('article > .prose')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `page overflow at ${width}`).toBe(true);
      expect(await page.locator('h1').count()).toBe(1);
      if (testInfo.project.name === 'chromium') {
        const directory = `docs/evidence/screenshots/${locale}`; mkdirSync(directory, { recursive: true });
        await page.screenshot({ path: `${directory}/reading-${width}.png`, fullPage: false });
      }
    }
    // A 1280px display at 200% has a 640 CSS-pixel viewport and two device pixels per CSS pixel.
    const zoomContext = await browser.newContext({ baseURL, viewport: { width: 640, height: 450 }, deviceScaleFactor: 2 });
    const zoomPage = await zoomContext.newPage(); await zoomPage.goto(path(locale));
    expect(await zoomPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(zoomPage.locator('article > .prose')).toBeVisible();
    if (testInfo.project.name === 'chromium') await zoomPage.screenshot({ path: `docs/evidence/screenshots/${locale}/reading-zoom-200.png` });
    await zoomContext.close();
    await page.setViewportSize({ width: 640, height: 900 });
    const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(report.violations).toEqual([]);
    await page.getByRole('button', { name: dictionary(locale).Ui.menu, exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  });
}
test('search retries a failed index request and clears old-language results', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/search/en?*', (route) => { if (attempts++ === 0) return route.abort(); return route.continue(); });
  await page.goto('/en'); await page.getByRole('button', { name: 'Search lessons' }).click();
  await page.getByRole('button', { name: 'Retry search' }).click();
  await page.getByRole('textbox', { name: 'Search lessons' }).fill('context');
  await expect(page.locator('.search-result').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.language-picker summary').click(); await page.locator('.language-options a[href="/fr"]').click();
  await page.getByRole('button', { name: 'Rechercher une leçon' }).click();
  await expect(page.getByRole('textbox')).toHaveValue(''); await expect(page.locator('.search-result')).toHaveCount(0);
});
