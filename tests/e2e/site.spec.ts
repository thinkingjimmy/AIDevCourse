/**
 * [INPUT]: The production server, authored catalog, localized messages, and all five language routes.
 * [OUTPUT]: Course-card layout, empty-course, publication, locale, and accessibility evidence with isolated language cases. Cards omit chip leader lines and names; the course hero keeps them.
 * [POS]: Public-site browser matrix, valid with an empty or partial course library.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { readCatalog } from '../../src/lib/content/manifest';
import { locales, htmlLanguages } from '../../src/lib/i18n/config';
for (const locale of locales) {
  test(`${locale}: home, about, and accessible navigation`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const path of ['', '/about']) {
      const response = path ? await page.request.get(`/${locale}${path}`) : await page.goto(`/${locale}`);
      expect(response?.status()).toBe(200);
      if (path) {
        await page.locator(`header a[href="/${locale}/about"]`).click();
        await expect(page).toHaveURL(new RegExp(`/${locale}/about$`));
      }
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
test('production publishes course entries and removes withdrawn lessons from discovery', async ({ request }) => {
  test.skip(process.env.CONTENT_TEST === '1', 'The isolated fixture build is covered separately.');
  const catalog = readCatalog();
  const paths = ['/zh', ...catalog.documents.map((document) => document.url), '/sitemap.xml', ...locales.map((lang) => `/api/search/${lang}`)];
  for (const path of paths) {
    const response = await request.get(path);
    const body = await response.text();
    expect(body, path).not.toContain('INTERNAL_FIXTURE_DO_NOT_PUBLISH');
    expect(body, path).not.toMatch(/审校中|In review|校閲中|En relecture|En revisión/);
    expect(response.status(), path).toBe(200);
  }
  for (const lang of locales) expect((await request.get(`/${lang}/courses`, { maxRedirects: 0 })).status()).toBe(404);
  const courses = await (await request.get('/zh/courses/ai-101')).text();
  expect(courses).toContain('AI 101');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const locale of locales) {
    const search = await (await request.get(`/api/search/${locale}`)).text();
    for (const slug of ['strengths', 'tokens', 'first-workflow']) {
      const path = `/${locale}/courses/ai-101/${slug}`;
      if (catalog.documents.some((document) => document.url === path)) continue;
      expect((await request.get(path)).status()).toBe(404);
      expect(sitemap).not.toContain(path);
      expect(search).not.toContain(path);
    }
  }
  for (const path of ['/zh/courses/ai-coding', '/zh/courses/ai-coding/workflow/verify-results', '/zh/courses/ai-101/models/strengths', '/zh/courses/ai-101/models']) {
    const missing = await request.get(path, { maxRedirects: 0 });
    expect(missing.status(), path).toBe(404);
  }
});

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'tablet', width: 840, height: 960 }, { name: 'mobile', width: 390, height: 844 }, { name: 'narrow', width: 320, height: 844 }]) {
  for (const locale of locales) {
    test(`${locale}: course cards and updating state work on ${viewport.name}`, async ({ page }) => {
      test.skip(process.env.CONTENT_TEST === '1', 'Public AI 101 cards use the authoring catalog.');
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const catalog = readCatalog();
      const messages = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
      const course = catalog.courses.find((item) => item.locale === locale && item.slug === 'ai-101')!;
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      const grid = page.locator('[data-slot="course-grid"]');
      const card = grid.getByRole('link', { name: 'AI 101', exact: true });
      await expect(card).toHaveCount(1);
      await expect(card.getByRole('heading')).toHaveText('AI 101');
      await expect(card).toContainText(course.description);
      await expect(card.locator('[data-slot="card-footer"]')).toHaveCount(0);
      await expect(card.locator('svg')).toHaveCount(1);
      await expect(card.locator('[data-anatomy="chip"] svg')).toHaveCount(1);
      await expect(card.locator('[data-anatomy="chip"]')).toHaveAttribute('data-callouts', 'false');
      await expect(card.locator('[data-anatomy="chip"] .co')).toHaveCount(0);
      const columns = await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
      const expectedColumns = viewport.width > 721 ? 2 : 1;
      expect(columns).toBe(expectedColumns);
      if (expectedColumns > 1) expect((await card.boundingBox())!.width).toBeLessThan((await grid.boundingBox())!.width / expectedColumns);
      const copyBox = (await card.locator('[data-slot="card-content"]').boundingBox())!;
      const illustrationBox = (await card.locator('[data-anatomy="chip"]').boundingBox())!;
      expect(copyBox.x + copyBox.width).toBeLessThanOrEqual(illustrationBox.x);
      const cardBox = (await card.boundingBox())!;
      const image = card.locator('[data-slot="course-card-image"]');
      const imageBox = (await image.boundingBox())!;
      await expect(image).toHaveCSS('background-color', 'rgb(244, 244, 245)');
      expect(imageBox.y).toBeCloseTo(cardBox.y + 1, 1);
      expect(imageBox.y + imageBox.height).toBeCloseTo(cardBox.y + cardBox.height - 1, 1);
      expect(imageBox.x + imageBox.width).toBeCloseTo(cardBox.x + cardBox.width - 1, 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (locale === 'zh') {
        const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(report.violations).toEqual([]);
        const path = test.info().outputPath(`course-card-${viewport.name}.png`);
        await grid.screenshot({ path });
        await test.info().attach('Course cards', { path, contentType: 'image/png' });
      }
      await card.focus();
      await card.press('Enter');
      await expect(page).toHaveURL(new RegExp(`${course.url}$`));
      await expect(page.locator('h1')).toHaveText('AI 101');
      await expect(page.locator('[data-anatomy="chip"]')).toHaveAttribute('data-callouts', 'true');
      await expect(page.locator('[data-anatomy="chip"] .co')).toHaveCount(6);
      if (!course.lessons.length) {
        await expect(page.locator('[data-slot="course-empty"]')).toContainText(messages.Course.updatingBody);
        await expect(page.getByRole('link', { name: messages.Course.startFirst, exact: true })).toHaveCount(0);
        await expect(page.locator('main a[href^="' + course.url + '/"]')).toHaveCount(0);
      }
      await expect(page.getByRole('contentinfo')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}

test('course cards open the updating overview without JavaScript', async ({ browser, baseURL }) => {
  test.skip(process.env.CONTENT_TEST === '1', 'Public AI 101 card.');
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/zh');
    await page.locator('[data-slot="course-grid"]').getByRole('link', { name: 'AI 101', exact: true }).click();
    await expect(page.locator('h1')).toHaveText('AI 101');
    await expect(page.getByRole('contentinfo')).toBeVisible();
    const path = test.info().outputPath('course-card-no-js.png');
    await page.screenshot({ path, fullPage: true });
    await test.info().attach('Course without JavaScript', { path, contentType: 'image/png' });
  } finally { await context.close(); }
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
    await expect(page.getByRole('button', { name: 'Rechercher une leçon', exact: true })).toHaveCount(0);
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
