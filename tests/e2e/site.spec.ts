import type { Locale } from '../../src/lib/i18n/config';
import { localePath } from '../../src/lib/i18n/routing';
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
      const response = path ? await page.request.get(localePath(locale as Locale, path || '/')) : await page.goto(localePath(locale as Locale, `/`));
      expect(response?.status()).toBe(200);
      if (!path) {
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('body')).toHaveCSS('font-family', /^["']?Geist["']?(?:,|\s)/);
        const loadedFonts = await page.evaluate(() => Array.from(document.fonts)
          .filter((font) => font.status === 'loaded').map((font) => font.family.replaceAll('"', '')));
        const cjkFamily = locale === 'zh' ? 'Noto Sans SC Variable' : locale === 'ja' ? 'Noto Sans JP Variable' : undefined;
        if (cjkFamily) {
          await expect(page.locator('body')).toHaveCSS('font-family', new RegExp(cjkFamily));
          expect(loadedFonts).toContain(cjkFamily);
          const screenshot = test.info().outputPath(`${locale}-noto-home.png`);
          await page.screenshot({ path: screenshot, animations: 'disabled' });
          await test.info().attach(`${locale} Noto typography`, { path: screenshot, contentType: 'image/png' });
        } else {
          expect(loadedFonts.some((family) => family.startsWith('Noto Sans'))).toBe(false);
        }
        await test.info().attach(`${locale}-fonts`, {
          body: JSON.stringify({ locale, loadedFonts, body: await page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily) }, null, 2),
          contentType: 'application/json',
        });
      }
      if (path) {
        await page.locator(`header a[href="${localePath(locale, '/about')}"]`).click();
        await expect(page).toHaveURL(new RegExp(localePath(locale as Locale, `/about$`)));
      }
      await expect(page.locator('html')).toHaveAttribute('lang', htmlLanguages[locale]);
      await expect(page.locator('h1')).toHaveCount(1);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(new URL(canonical!).pathname).toBe(localePath(locale, path || '/'));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.waitForLoadState('networkidle');
    }
    const missingIndex = await page.request.get(localePath(locale as Locale, `/courses`));
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
test('negotiates only the homepage and keeps English paths prefix-free', async ({ request }) => {
  const fallbackEvidence = [];
  for (const headers of [
    { Cookie: '', 'Accept-Language': '' },
    { Cookie: '', 'Accept-Language': 'de-DE,ko;q=.8' },
    { Cookie: 'lac-language=invalid', 'Accept-Language': 'de;q=0' },
  ]) {
    const fallback = await request.get('/', { headers, maxRedirects: 0 });
    expect(fallback.status()).toBe(200);
    expect(fallback.headers().location).toBeUndefined();
    expect(await fallback.text()).toContain('lang="en"');
    expect(fallback.headers()['cache-control']).toContain('no-store');
    fallbackEvidence.push({ request: headers, status: fallback.status(), location: fallback.headers().location });
  }
  await test.info().attach('English homepage responses', { body: JSON.stringify(fallbackEvidence, null, 2), contentType: 'application/json' });
  const response = await request.get('/', { headers: { 'Accept-Language': 'ja-JP,fr;q=.5', Cookie: 'lac-language=es' }, maxRedirects: 0 });
  expect(response.status()).toBe(307); expect(response.headers().location).toMatch(/\/es$/);
  expect(response.headers()['cache-control']).toContain('no-store'); expect(response.headers().vary).toContain('Cookie');
  const browser = await request.get('/', { headers: { 'Accept-Language': 'de,fr-FR;q=.8' }, maxRedirects: 0 });
  expect(browser.headers().location).toMatch(/\/fr$/);
  const chinese = await request.get('/', { headers: { 'Accept-Language': 'zh-CN,en;q=.8' }, maxRedirects: 0 });
  expect(chinese.headers().location).toMatch(/\/zh$/);
  const explicit = await request.get('/about', { headers: { Cookie: 'lac-language=zh' }, maxRedirects: 0 });
  expect(explicit.status()).toBe(200); expect(explicit.headers().link).toBeUndefined();
  for (const path of ['/de/courses', '/unknown/path', '/api/search/de', '/fr/courses/missing-course']) {
    const missing = await request.get(path, { maxRedirects: 0 }); expect(missing.status(), path).toBe(404);
  }
  expect((await request.get('/favicon.svg')).status()).toBe(200);
  for (const locale of locales) {
    const missing = await request.get(localePath(locale as Locale, `/unknown-page`));
    expect(missing.status()).toBe(404);
    expect(await missing.text()).toContain(`lang="${htmlLanguages[locale]}"`);
  }
});
test('production publishes course entries and removes withdrawn lessons from discovery', async ({ request }) => {
  test.skip(process.env.CONTENT_TEST === '1', 'The isolated fixture build is covered separately.');
  const catalog = readCatalog();
  for (const locale of locales) {
    const course = catalog.courses.find((item) => item.locale === locale && item.slug === 'llm-101');
    expect(course).toMatchObject({ id: 'llm-101', title: 'LLM 101', url: localePath(locale, '/courses/llm-101') });
  }
  await test.info().attach('published-course-identities', {
    body: JSON.stringify(catalog.courses.map(({ locale, id, slug, title, url }) => ({ locale, id, slug, title, url })), null, 2),
    contentType: 'application/json',
  });
  const paths = ['/zh', ...catalog.documents.map((document) => document.url), '/sitemap.xml', ...locales.map((lang) => `/api/search/${lang}`)];
  for (const path of paths) {
    const response = await request.get(path);
    const body = await response.text();
    expect(body, path).not.toContain('INTERNAL_FIXTURE_DO_NOT_PUBLISH');
    expect(body, path).not.toMatch(/审校中|In review|校閲中|En relecture|En revisión/);
    expect(response.status(), path).toBe(200);
  }
  for (const lang of locales) expect((await request.get(localePath(lang as Locale, `/courses`), { maxRedirects: 0 })).status()).toBe(404);
  const courses = await (await request.get('/zh/courses/llm-101')).text();
  expect(courses).toContain('LLM 101');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const locale of locales) {
    const search = await (await request.get(`/api/search/${locale}`)).text();
    for (const slug of ['strengths', 'tokens', 'first-workflow']) {
      const path = localePath(locale as Locale, `/courses/llm-101/${slug}`);
      if (catalog.documents.some((document) => document.url === path)) continue;
      expect((await request.get(path)).status()).toBe(404);
      expect(sitemap).not.toContain(path);
      expect(search).not.toContain(path);
    }
  }
  for (const path of ['/zh/courses/ai-coding', '/zh/courses/ai-coding/workflow/verify-results', '/zh/courses/llm-101/models/strengths', '/zh/courses/llm-101/models']) {
    const missing = await request.get(path, { maxRedirects: 0 });
    expect(missing.status(), path).toBe(404);
  }
});

test('minimal frontmatter renders course, article, and search without manual metadata', async ({ page }) => {
  const catalog = readCatalog();
  for (const course of catalog.courses) {
    const first = course.lessons[0];
    if (!first) continue;
    const response = await page.goto(course.url);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(course.title);
    await expect(page.getByRole('link', { name: first.title }).first()).toHaveAttribute('href', first.url);
    await page.goto(first.url);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(first.title);
    await expect(page.locator('article > .prose')).toBeVisible();
    await expect(page.locator('.notice')).toHaveCount(0);
  }
  const english = catalog.courses.find((course) => course.locale === 'en')!;
  await page.goto(english.lessons[0].url);
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog').getByRole('textbox').fill(process.env.CONTENT_TEST === '1' ? 'context' : 'LLM');
  await expect(page.locator('.search-result small').first()).toHaveText(english.lessons[0].moduleTitle);
  await page.keyboard.press('Escape');
  await page.goto(english.url);
  const screenshot = test.info().outputPath('minimal-course-metadata.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  await test.info().attach('Course without manual time or type metadata', { path: screenshot, contentType: 'image/png' });
});

test.describe('English URL policy', () => {
  test.use({ locale: 'zh-CN' });

  test('prefix-free English navigation, language switching, search, and SEO stay aligned', async ({ page, context, request }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page).toHaveURL(/\/zh$/);
    await page.locator('.language-picker summary').click();
    await page.getByRole('link', { name: 'English', exact: true }).click();
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('header a[href="/about"]')).toBeVisible();
    await page.locator('header a[href="/about"]').click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/about$/);
    await expect(page.locator('link[hreflang="zh-Hans"]')).toHaveAttribute('href', /\/zh\/about$/);

    await context.addCookies([{ name: 'lac-language', value: 'zh', url: page.url() }]);
    const path = process.env.CONTENT_TEST === '1' ? '/courses/ai-coding/first-change' : '/courses/llm-101/what-a-language-model-does';
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('article > .prose')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path}$`));
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', new RegExp(`${path}$`));
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', new RegExp(`${path}$`));
    expect(await page.locator('a[href^="/en"]').count()).toBe(0);
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Control+k');
    const search = page.getByRole('dialog').getByRole('textbox');
    await search.fill(process.env.CONTENT_TEST === '1' ? 'context' : 'LLM');
    await expect(page.locator('.search-result').first()).toHaveAttribute('href', /^\/courses\//);
    const destination = await page.locator('.search-result').first().getAttribute('href');
    await page.locator('.search-result').first().click();
    await expect(page).toHaveURL(new URL(destination!, page.url()).href);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(errors).toEqual([]);
    const screenshot = test.info().outputPath('prefix-free-english-lesson.png');
    await page.screenshot({ path: screenshot, fullPage: true });
    await test.info().attach('English lesson without a locale prefix', { path: screenshot, contentType: 'image/png' });

    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain(path);
    expect(sitemap).not.toMatch(/https?:\/\/[^<"\s]+\/en(?:\/|<|")/);
    const alias = await request.get(`/en${path}?from=old`, { maxRedirects: 0 });
    expect(alias.status()).toBe(308);
    expect(new URL(alias.headers().location, page.url()).pathname).toBe(path);
    expect(alias.headers().location).toContain('?from=old');
  });

  test('native English homepage selection overrides browser language without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, locale: 'fr-FR' });
    try {
      const page = await context.newPage();
      await page.goto('/');
      await expect(page).toHaveURL(/\/fr$/);
      await page.locator('.language-picker summary').click();
      await page.getByRole('link', { name: 'English', exact: true }).click();
      expect(new URL(page.url()).pathname).toBe('/');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      const canonical = new URL((await page.locator('link[rel="canonical"]').getAttribute('href'))!);
      expect(canonical.pathname).toBe('/');
      expect(canonical.search).toBe('');
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      const screenshot = test.info().outputPath('english-home-no-js.png');
      await page.screenshot({ path: screenshot });
      await test.info().attach('English home without JavaScript', { path: screenshot, contentType: 'image/png' });
    } finally { await context.close(); }
  });
});

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'tablet', width: 840, height: 960 }, { name: 'mobile', width: 390, height: 844 }, { name: 'narrow', width: 320, height: 844 }]) {
  for (const locale of locales) {
    test(`${locale}: course cards and updating state work on ${viewport.name}`, async ({ page }) => {
      test.skip(process.env.CONTENT_TEST === '1', 'Public LLM 101 cards use the authoring catalog.');
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const catalog = readCatalog();
      const messages = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
      const course = catalog.courses.find((item) => item.locale === locale && item.slug === 'llm-101')!;
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(localePath(locale as Locale, `/`));
      await page.evaluate(() => document.fonts.ready);
      const grid = page.locator('[data-slot="course-grid"]');
      const card = grid.getByRole('link', { name: 'LLM 101', exact: true });
      await expect(card).toHaveCount(1);
      await expect(card.getByRole('heading')).toHaveText('LLM 101');
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
      await expect(page.locator('h1')).toHaveText('LLM 101');
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

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`home hero aligns with navigation and preserves menu depth on ${viewport.name}`, async ({ page }) => {
    test.skip(process.env.CONTENT_TEST === '1', 'Public homepage learning actions.');
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const catalog = readCatalog();
    for (const locale of locales) {
      await page.goto(localePath(locale as Locale, `/`));
      await page.evaluate(() => document.fonts.ready);
      const messages = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
      const action = page.getByRole('link', { name: messages.Home.start, exact: true });
      const title = page.locator('main h1');
      const intro = title.locator('..').locator('p');
      await expect(title).toHaveCSS('font-family', /Geist Pixel/);
      await expect(title).toHaveCSS('font-weight', '400');
      await expect(page.locator('body')).toHaveCSS('font-family', /^["']?Geist["']?(?:,|\s)/);
      await expect(intro).toHaveCSS('font-family', /^["']?Geist["']?(?:,|\s)/);
      const loadedFonts = await page.evaluate(() => Array.from(document.fonts)
        .filter((font) => font.status === 'loaded').map((font) => font.family.replaceAll('"', '')));
      expect(loadedFonts).toContain('Geist Variable');
      expect(loadedFonts).toContain('Geist Pixel');
      await expect(intro).toHaveCount(1);
      await expect(intro).toHaveText(messages.Home.intro);
      await expect(page.getByText(messages.Home.eyebrow, { exact: true })).toHaveCount(0);
      const catalogHeading = page.getByRole('heading', { name: messages.Home.courseTitle, exact: true });
      await expect(catalogHeading.locator('..').locator(':scope > p')).toHaveCount(0);
      if (locale === 'zh') {
        await expect(catalogHeading).toHaveText('基础');
        const path = test.info().outputPath(`basics-catalog-${viewport.name}.png`);
        await page.locator('#catalog').screenshot({ path });
        await test.info().attach('Fundamentals catalog', { path, contentType: 'image/png' });
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      const logo = await page.locator('header a').first().boundingBox();
      for (const element of [title, intro, action, page.getByRole('heading', { name: messages.Home.courseTitle, exact: true })]) {
        expect((await element.boundingBox())!.x).toBeCloseTo(logo!.x, 1);
      }
      const course = catalog.courses.find((item) => item.locale === locale && item.slug === 'llm-101')!;
      await expect(action).toHaveAttribute('href', course.lessons[0].url);
      await page.locator('.language-picker summary').click();
      const menu = page.locator('.language-options');
      await expect(menu).toBeVisible();
      const surface = await menu.evaluate((element) => {
        const style = getComputedStyle(element);
        return { border: style.border, shadow: style.boxShadow, color: style.color, background: style.backgroundColor };
      });
      expect(surface.shadow).not.toBe('none');
      await page.keyboard.press('Escape');
      await expect(action).toHaveCSS('border', surface.border);
      await expect(action).toHaveCSS('border-radius', '0px');
      await expect(action).toHaveCSS('color', surface.color);
      await expect(action).toHaveCSS('background-color', surface.background);
      await expect(action).toHaveCSS('box-shadow', surface.shadow);
      const actionBox = await action.boundingBox();
      await action.hover();
      await expect(action).toHaveCSS('box-shadow', surface.shadow);
      expect(await action.boundingBox()).toEqual(actionBox);
      if (locale === 'en') {
        const path = test.info().outputPath(`home-action-hover-${viewport.name}.png`);
        await page.screenshot({ path, fullPage: true });
        await test.info().attach('Homepage action hover', { path, contentType: 'image/png' });
      }
      const card = page.locator('[data-slot="course-grid"]').getByRole('link', { name: 'LLM 101', exact: true });
      const cardSurface = card.locator('[data-slot="card"]');
      await expect(cardSurface).toHaveCSS('box-shadow', 'none');
      await card.scrollIntoViewIfNeeded();
      const cardBox = await card.boundingBox();
      await card.hover();
      await expect(cardSurface).toHaveCSS('box-shadow', surface.shadow);
      expect(await card.boundingBox()).toEqual(cardBox);
      if (locale === 'en') {
        const path = test.info().outputPath(`course-card-hover-${viewport.name}.png`);
        await page.screenshot({ path, fullPage: true });
        await test.info().attach('Course card hover', { path, contentType: 'image/png' });
      }
      await page.mouse.move(0, 0);
      await expect(cardSurface).toHaveCSS('box-shadow', 'none');
      await page.keyboard.press('Tab');
      await card.focus();
      await expect(cardSurface).toHaveCSS('box-shadow', surface.shadow);
      await action.focus();
      await expect(action).toHaveCSS('outline-style', 'solid');
      await action.press('Enter');
      await expect(page).toHaveURL(new RegExp(`${course.lessons[0].url}$`));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

test('course cards open the updating overview without JavaScript', async ({ browser, baseURL }) => {
  test.skip(process.env.CONTENT_TEST === '1', 'Public LLM 101 card.');
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/zh');
    await page.locator('[data-slot="course-grid"]').getByRole('link', { name: 'LLM 101', exact: true }).click();
    await expect(page.locator('h1')).toHaveText('LLM 101');
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
  await page.goto('/');
  expect(await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(255, 255, 255)');
  await page.goto('/about');
  expect(await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(255, 255, 255)');
});
