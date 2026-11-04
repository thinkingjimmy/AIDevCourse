import { localePath } from '../../src/lib/i18n/routing';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { locales, type Locale } from '../../src/lib/i18n/config';
test.skip(process.env.CONTENT_TEST !== '1', 'Requires the isolated nonpublic fixture build.');
const path = (locale: string, slug = 'first-change') => localePath(locale as Locale, `/courses/ai-coding/${slug}`);
const dictionary = (locale: Locale) => JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
test('recent visits stay separate from achievements and legacy completion', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lac:v1:llm-101:achievement:generation-vs-verification', JSON.stringify({ unlockedAt: '2026-10-01T00:00:00Z' }));
    localStorage.setItem('lac:v1:ai-coding:lesson:first-change', JSON.stringify({ completed: true, updatedAt: '2026-10-01T00:00:00Z' }));
  });
  await page.goto(path('zh'));
  await expect(page.locator('[data-achievement-count]')).toContainText('已解锁 0 项成就');
  await expect(page.locator('[data-slot="lesson-completed"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '标记为已完成', exact: true })).toBeEnabled();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lac:v1:ai-coding:last') ?? 'null')?.lessonId)).toBe('first-change');
  await page.goto(path('en', 'useful-context'));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lac:v1:ai-coding:last') ?? 'null')?.lessonId)).toBe('useful-context');
  await expect(page.locator('[data-achievement-count]')).toContainText('0 achievements unlocked');
  expect(await page.evaluate(() => localStorage.getItem('lac:v1:ai-coding:lesson:first-change'))).toContain('"completed":true');
  expect(await page.evaluate(() => localStorage.getItem('lac:v1:llm-101:achievement:generation-vs-verification'))).not.toBeNull();
  await test.info().attach('course-isolation-and-visits', { body: await page.screenshot(), contentType: 'image/png' });
});
for (const viewport of [{ name: 'desktop', width: 1280, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`declarative achievements span articles and languages on ${viewport.name}`, async ({ page, context }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      if (localStorage.getItem('generic-fixture-seeded')) return;
      localStorage.setItem('generic-fixture-seeded', 'yes');
      localStorage.setItem('lac:v1:ai-coding:achievement:unknown-achievement', JSON.stringify({ unlockedAt: '2026-10-01T00:00:00Z' }));
      localStorage.setItem('lac:v1:ai-coding:lesson:first-change', JSON.stringify({ completed: true, updatedAt: '2026-10-01T00:00:00Z' }));
      localStorage.setItem('lac:v1:llm-101:achievement:generation-vs-verification', JSON.stringify({ unlockedAt: '2026-10-01T00:00:00Z' }));
    });
    await page.goto(path('zh', 'useful-context'));
    const expectProgress = async (count: number) => {
      if (viewport.name === 'mobile') await page.getByRole('button', { name: '课程目录', exact: true }).click();
      await expect(page.locator('[data-achievement-count]')).toContainText(`已解锁 ${count} 项成就`);
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(count * 50));
      await test.info().attach(`generic-progress-${viewport.name}-${count}`, { body: await page.locator('[data-sidebar="footer"]').screenshot(), contentType: 'image/png' });
      if (viewport.name === 'mobile') await page.keyboard.press('Escape');
    };
    const first = page.locator('[data-achievement="context-before-code"]');
    await expect(first.getByRole('radio').first()).toBeEnabled();
    await expectProgress(0);
    await test.info().attach(`generic-before-${viewport.name}`, { body: await first.screenshot(), contentType: 'image/png' });
    await first.getByRole('radio').first().check();
    await expect(first.getByRole('status')).toContainText('Context helps the model make a useful change.');
    await first.getByRole('radio').nth(2).click();
    await expect(first).toHaveAttribute('data-state', 'unlocked');
    await expect(first.getByRole('status')).toContainText('回答正确');
    await expect(first.getByRole('heading')).toContainText('Context builder');
    await expectProgress(1);
    const saved = await page.evaluate(() => localStorage.getItem('lac:v1:ai-coding:achievement:context-before-code'));
    await page.reload();
    await expect(first).toHaveAttribute('data-state', 'unlocked');
    await expect(first.getByRole('status')).toBeEmpty();
    expect(await page.evaluate(() => localStorage.getItem('lac:v1:ai-coding:achievement:context-before-code'))).toBe(saved);
    const secondTab = await context.newPage();
    await secondTab.goto(path('en', 'useful-context'));
    await expect(secondTab.locator('[data-achievement="context-before-code"]')).toHaveAttribute('data-state', 'unlocked');
    await expect(secondTab.locator('[data-achievement-count]')).toContainText('1 achievement unlocked');
    await page.goto(path('zh', 'verify-results'));
    const second = page.locator('[data-achievement="verify-before-done"]');
    await second.getByRole('radio').last().click();
    await expect(second).toHaveAttribute('data-state', 'unlocked');
    await expectProgress(2);
    await expect(secondTab.locator('[data-achievement-count]')).toContainText('2 achievements unlocked');
    await expect(secondTab.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(await page.evaluate(() => localStorage.getItem('lac:v1:llm-101:achievement:generation-vs-verification'))).not.toBeNull();
    await test.info().attach(`generic-after-${viewport.name}`, { body: await second.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    const accessibility = await new AxeBuilder({ page }).include('[data-achievement]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    if (viewport.name === 'mobile') await page.getByRole('button', { name: '课程目录', exact: true }).click();
    await test.info().attach(`generic-footer-${viewport.name}`, { body: await page.screenshot(), contentType: 'image/png' });
    await secondTab.close();
  });
}

test('explains missing translations and keeps direct access a real 404', async ({ page, request }) => {
  await page.goto(path('zh', 'verify-results'));
  await page.getByRole('button', { name: '更多', exact: true }).click();
  await page.getByRole('menuitem', { name: '修改语言', exact: true }).click();
  const english = page.locator('.language-options a[href="/courses/ai-coding"]');
  await expect(english).toContainText('此课暂无译文'); await english.click();
  await expect(page).toHaveURL(/\/courses\/ai-coding$/);
  const missing = await request.get(path('en', 'verify-results'));
  expect(missing.status()).toBe(404); expect(await missing.text()).not.toContain('WITHDRAWN_SECRET');
  for (const lang of locales) {
    const body = await (await request.get(`/api/search/${lang}`)).text();
    expect(body).not.toContain('WITHDRAWN_SECRET'); expect(body).not.toContain('DRAFT_TRANSLATION_SECRET');
  }
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).not.toContain('/courses/ai-coding/foundations/verify-results');
  await page.goto(path('fr'));
  const alternates = await page.locator('link[rel="alternate"]').evaluateAll((links) => links.map((link) => link.getAttribute('hreflang')));
  expect(alternates).toEqual(expect.arrayContaining(['en', 'zh-Hans', 'ja', 'fr', 'es', 'x-default']));
  await expect(page.locator('.notice')).toHaveCount(0);
});
test('blocked storage and failed clipboard do not prevent reading', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('Denied')) } });
  });
  await page.goto(path('zh'));
  await expect(page.locator('article > .prose')).toContainText('上下文');
  await expect(page.getByRole('button', { name: '标记为已完成', exact: true })).toBeEnabled();
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
    await page.waitForLoadState('networkidle');
    expect(indexes).toHaveLength(0);
    await page.keyboard.press('Control+k');
    const input = page.getByRole('textbox', { name: t.Search.open });
    for (const query of queries[locale]) {
      await input.fill('');
      await expect(page.locator('.search-result')).toHaveCount(0);
      await input.fill(query);
      await expect(page.locator('.search-result').first()).toBeVisible();
      const urls = await page.locator('.search-result').evaluateAll((links) => links.slice(0, 5).map((link) => link.getAttribute('href')));
      expect(urls.some((url) => url?.includes('/ai-coding/first-change'))).toBe(true);
      expect(urls.every((url) => url?.startsWith(localePath(locale as Locale, `/courses/`)))).toBe(true);
      expect(urls.every((url) => !url?.startsWith(localePath(locale as Locale, `/courses/ai-coding#`)))).toBe(true);
    }
    expect(indexes.every((url) => url.includes(`/api/search/${locale}?`))).toBe(true);
    await input.dispatchEvent('compositionstart');
    await input.press('Enter'); await expect(page.getByRole('dialog')).toBeVisible();
    await input.dispatchEvent('compositionend');
    const resultUrls = await page.locator('.search-result').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    const headingIndex = resultUrls.findIndex((url) => url?.startsWith(`${path(locale)}#`));
    expect(headingIndex).toBeGreaterThanOrEqual(0);
    for (let index = 0; index < headingIndex; index++) await input.press('ArrowDown');
    const destination = await page.locator('.search-result[data-selected="true"]').getAttribute('href');
    expect(destination).not.toBeNull();
    await input.press('Enter');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page).toHaveURL(new URL(destination!, page.url()).href);
    const hash = new URL(page.url()).hash;
    expect(hash).not.toBe('');
    await expect(page.locator(`[id="${decodeURIComponent(hash.slice(1))}"]`)).toHaveCount(1);
    const screenshot = test.info().outputPath('search-heading.png');
    await page.screenshot({ path: screenshot });
    await test.info().attach('search-heading', { path: screenshot, contentType: 'image/png' });
  });
  test(`${locale}: five viewports, 200% equivalent zoom, and accessible reading`, async ({ page, browser, baseURL }, testInfo) => {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await page.goto(path(locale));
      await expect(page.locator('article > .prose')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `page overflow at ${width}`).toBe(true);
      expect(await page.locator('h1').count()).toBe(1);
      if (testInfo.project.name === 'chromium') {
        const screenshot = testInfo.outputPath(`reading-${width}.png`);
        await page.screenshot({ path: screenshot });
        await testInfo.attach(`Reading at ${width}px`, { path: screenshot, contentType: 'image/png' });
      }
    }
    // A 1280px display at 200% has a 640 CSS-pixel viewport and two device pixels per CSS pixel.
    const zoomContext = await browser.newContext({ baseURL, viewport: { width: 640, height: 450 }, deviceScaleFactor: 2 });
    const zoomPage = await zoomContext.newPage(); await zoomPage.goto(path(locale));
    expect(await zoomPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(zoomPage.locator('article > .prose')).toBeVisible();
    if (testInfo.project.name === 'chromium') {
      const screenshot = testInfo.outputPath('reading-zoom-200.png');
      await zoomPage.screenshot({ path: screenshot });
      await testInfo.attach('Reading at 200% scale', { path: screenshot, contentType: 'image/png' });
    }
    await zoomContext.close();
    await page.setViewportSize({ width: 640, height: 900 });
    const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(report.violations).toEqual([]);
    await page.getByRole('button', { name: dictionary(locale).Ui.menu, exact: true }).click();
    await expect(page.locator('.mobile-course-bar .course-navigation')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.mobile-course-bar')).not.toHaveAttribute('open');
  });
}
test('search retries a failed index request and clears old-language results', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/search/en?*', (route) => { if (attempts++ === 0) return route.abort(); return route.continue(); });
  await page.goto('/'); await page.waitForLoadState('networkidle'); await page.keyboard.press('Control+k');
  await page.getByRole('button', { name: 'Retry search' }).click();
  await page.getByRole('textbox', { name: 'Search lessons' }).fill('context');
  await expect(page.locator('.search-result').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.language-picker summary').click(); await page.locator('.language-options a[href="/fr"]').click();
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('textbox')).toHaveValue(''); await expect(page.locator('.search-result')).toHaveCount(0);
});
