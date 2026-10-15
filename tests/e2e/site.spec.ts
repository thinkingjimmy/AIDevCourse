/**
 * [INPUT]: The actual production server and all five language routes.
 * [OUTPUT]: HTTP, locale, SEO, no-JS, keyboard, and accessibility acceptance tests.
 * [POS]: Public-site browser matrix, valid with an empty or partial course library.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { locales, htmlLanguages } from '../../src/lib/i18n/config';
for (const locale of locales) {
  test(`${locale}: home, about, and accessible navigation`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const path of ['', '/about']) {
      const response = await page.goto(`/${locale}${path}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', htmlLanguages[locale]);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/${locale}${path}$`));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.waitForLoadState('networkidle');
    }
    const missingIndex = await page.request.get(`/${locale}/courses`);
    expect(missingIndex.status()).toBe(404);
    const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(report.violations).toEqual([]);
    expect(errors).toEqual([]);
    await page.locator('.language-picker summary').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.language-options')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.language-picker')).not.toHaveAttribute('open');
  });
}
test('negotiates only supported unprefixed entries with private 307 responses', async ({ request }) => {
  const response = await request.get('/', { headers: { 'Accept-Language': 'ja-JP,fr;q=.5', Cookie: 'lac-language=es' }, maxRedirects: 0 });
  expect(response.status()).toBe(307); expect(response.headers().location).toMatch(/\/es$/);
  expect(response.headers()['cache-control']).toContain('no-store'); expect(response.headers().vary).toContain('Cookie');
  const browser = await request.get('/about', { headers: { 'Accept-Language': 'de,fr-FR;q=.8' }, maxRedirects: 0 });
  expect(browser.headers().location).toMatch(/\/fr\/about$/);
  const explicit = await request.get('/en', { headers: { Cookie: 'lac-language=zh' }, maxRedirects: 0 });
  expect(explicit.status()).toBe(200); expect(explicit.headers().link).toBeUndefined();
  for (const path of ['/de/courses', '/unknown/path', '/api/search/de', '/fr/courses/missing-course']) {
    const missing = await request.get(path, { maxRedirects: 0 }); expect(missing.status(), path).toBe(404);
  }
  expect((await request.get('/favicon.svg')).status()).toBe(200);
  for (const locale of locales) {
    const missing = await request.get(`/${locale}/unknown-page`);
    expect(missing.status()).toBe(404);
    expect(await missing.text()).toContain(`lang="${htmlLanguages[locale]}"`);
  }
});
test('production publishes the Chinese course and never publishes engineering fixtures', async ({ request }) => {
  test.skip(process.env.CONTENT_TEST === '1', 'The isolated fixture build is covered separately.');
  const paths = ['/zh', '/zh/courses/ai-101', '/zh/courses/ai-101/strengths', '/sitemap.xml', ...locales.map((lang) => `/api/search/${lang}`)];
  for (const path of paths) {
    const response = await request.get(path);
    const body = await response.text();
    expect(body, path).not.toContain('INTERNAL_FIXTURE_DO_NOT_PUBLISH');
    expect(body, path).not.toMatch(/审校中|In review|校閲中|En relecture|En revisión/);
    if (path.startsWith('/zh/courses/ai-101')) expect(response.status(), path).toBe(200);
  }
  for (const lang of locales) expect((await request.get(`/${lang}/courses`, { maxRedirects: 0 })).status()).toBe(404);
  const courses = await (await request.get('/zh/courses/ai-101')).text();
  expect(courses).toContain('AI 入门');
  expect(courses).toContain('AI 擅长做什么');
  expect(courses).toContain('写一个好用的提示词');
  expect(courses).toContain('验证结果');
  const lesson = await request.get('/zh/courses/ai-101/strengths');
  expect(lesson.status()).toBe(200);
  expect(await lesson.text()).toContain('先看任务，不看口号');
  const rsc = await request.get('/zh/courses/ai-101/strengths', { headers: { RSC: '1' } });
  expect(await rsc.text()).toContain('先看任务，不看口号');
  for (const path of ['/zh/courses/ai-coding', '/zh/courses/ai-coding/workflow/verify-results', '/zh/courses/ai-101/models/strengths', '/zh/courses/ai-101/models']) {
    const missing = await request.get(path, { maxRedirects: 0 });
    expect(missing.status(), path).toBe(404);
  }
});
test('reading and native language links work without JavaScript or cookies', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); await page.goto('/ja/about');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.nojs-notice')).toContainText('JavaScript');
  await page.locator('.language-picker summary').click();
  await page.locator('.language-options a[href="/fr/about"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  const missing = await page.goto('/fr/unknown-page');
  expect(missing?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Cette pièce n’est pas encore installée');
  if (process.env.CONTENT_TEST === '1') {
    await page.goto('/fr/courses/ai-coding/first-change');
    await expect(page.locator('article > .prose')).toBeVisible();
    await expect(page.locator('.search-trigger')).not.toBeVisible();
    await page.locator('.mobile-course-bar summary').first().click();
    await expect(page.locator('.mobile-course-bar .course-navigation')).toBeVisible();
  }
  await context.close();
});
test('keeps a light background when the system requests dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/en');
  expect(await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(255, 255, 255)');
  await page.goto('/en/about');
  expect(await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(255, 255, 255)');
});
