import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { locales, htmlLanguages } from '../../../src/lib/i18n/config';
import { localePath } from '../../../src/lib/i18n/routing';

test.use({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
const path = '/zh/vocabulary/typography';

test('resource disk opens the dictionary and returns to the homepage', async ({ page }, testInfo) => {
  await page.goto('/zh');
  const resources = page.getByRole('region', { name: '学习资源', exact: true });
  const disk = resources.getByRole('link', { name: '设计词典', exact: true });
  await expect(disk).toHaveAttribute('href', path);
  await expect(disk.locator('.disk-meta')).toHaveText('工具34 词条');
  await testInfo.attach('Learning resources disk', { body: await resources.screenshot(), contentType: 'image/png' });
  await disk.focus();
  await disk.press('Enter');
  await expect(page).toHaveURL(path);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('文字排版');
  await expect(page.locator('[data-slot="site-window"]')).toHaveAttribute('data-variant', 'reading');
  await expect.poll(() => page.locator('.vocabulary-term').count()).toBeGreaterThanOrEqual(6);
  await expect(page.locator('.vocabulary-heading h1')).toHaveText('文字排版');
  await testInfo.attach('Typography desktop', { body: await page.screenshot(), contentType: 'image/png' });
  await page.locator('.site-header-logo').click();
  await expect(page).toHaveURL('/zh');
  await expect(disk).toBeVisible();
});

for (const width of [1440, 390]) {
  test(`dictionary disk animation completes in both directions at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/zh');
    const disk = page.locator('[data-resource-disk="vocabulary"]');
    await disk.click();
    await expect(page.locator('.home-gallery')).toHaveAttribute('data-disk-phase', 'lifting');
    await expect(page.locator('.flying-course-disk')).toBeVisible();
    await expect(page).toHaveURL(path);
    await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('文字排版');
    await page.locator('.site-header-logo').click();
    await expect(page).toHaveURL('/zh');
    await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
    await expect(page.locator('.home-gallery')).not.toHaveAttribute('inert');
    await expect(disk).toBeVisible();
    await testInfo.attach(`Dictionary round trip ${width}px`, { body: await page.screenshot(), contentType: 'image/png' });
  });
}

test('sidebar retains search, loads distant cards, restores history and collapses', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(path);
  const sidebar = page.locator('[data-slot="sidebar-inner"]');
  const source = sidebar.locator('[data-slot="sidebar-header"]').getByRole('link', { name: '术语参考：Index', exact: true });
  await expect(source).toBeVisible();
  await expect(source).toHaveAttribute('href', 'https://index.how/to/articulate');
  await expect(source).toHaveAttribute('target', '_blank');
  await expect(source.locator('svg')).toHaveCount(1);
  await expect(sidebar.locator('[data-slot="sidebar-footer"]')).toHaveCount(0);
  await page.context().route('https://index.how/to/articulate', route => route.fulfill({ contentType: 'text/html', body: '<title>Index Vocabulary</title>' }));
  const popupPromise = page.context().waitForEvent('page');
  await source.click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await expect(popup).toHaveURL('https://index.how/to/articulate');
  await popup.close();
  await testInfo.attach('Dictionary source icon', { body: await sidebar.locator('[data-slot="sidebar-header"]').screenshot(), contentType: 'image/png' });
  await expect(sidebar.locator('a[data-active="true"], a[aria-current]')).toHaveCount(0);
  const search = sidebar.getByRole('searchbox', { name: '搜索词条' });
  await search.fill('SUBSCRIPT');
  await sidebar.getByRole('link', { name: '下标', exact: true }).click();
  await expect(page).toHaveURL(`${path}#subscript`);
  await expect(search).toHaveValue('SUBSCRIPT');
  const last = page.locator('#subscript');
  await expect(last).toBeInViewport();
  await expect(last).toHaveAttribute('data-selected', 'true');
  await expect(sidebar.locator('a[data-active="true"], a[aria-current]')).toHaveCount(0);
  await expect(page.locator('.vocabulary-term')).toHaveCount(21);
  await last.getByRole('tab', { name: '开启', exact: true }).click();
  await expect(last.locator('sub')).toHaveText('2');
  await testInfo.attach('Search and distant term', { body: await page.screenshot(), contentType: 'image/png' });
  await search.fill('字偶距');
  await sidebar.getByRole('link', { name: '字偶距', exact: true }).click();
  await expect(page.locator('#kerning')).toBeInViewport();
  await page.goBack();
  await expect(last).toBeInViewport();
  await expect(last.locator('sub')).toHaveText('2');
  await expect(search).toHaveValue('字偶距');
  await page.locator('[data-slot="vocabulary-scroll"]').evaluate(element => { element.scrollTop = 0; });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(sidebar.locator('a[data-active="true"], a[aria-current]')).toHaveCount(0);
  await expect(last).toHaveAttribute('data-selected', 'true');
  await search.fill('does-not-exist');
  await expect(sidebar.getByText('没有匹配的词条，试试其他关键词。')).toBeVisible();
  await sidebar.getByRole('button', { name: '清除搜索' }).click();
  await sidebar.locator('summary').first().click();
  await expect(sidebar.locator('a[href="#kerning"]')).not.toBeVisible();
  await sidebar.locator('summary').first().click();
  await expect(sidebar.locator('a[href="#kerning"]')).toBeVisible();
  await sidebar.getByRole('button', { name: '收起词典目录' }).click();
  await expect(search).not.toBeVisible();
  await sidebar.getByRole('button', { name: '打开词典目录' }).click();
  await expect(search).toBeVisible();
  expect(errors).toEqual([]);
});

test('scrolling appends batches without losing demo state or moving the viewport back', async ({ page }, testInfo) => {
  await page.goto(path);
  const pane = page.locator('[data-slot="vocabulary-scroll"]');
  const kerningToggle = page.locator('#kerning').getByRole('tab', { name: '开启', exact: true });
  await kerningToggle.click();
  await page.locator('[data-slot="sidebar-inner"] a[href="#leading"]').click();
  const before = await pane.evaluate(element => {
    element.scrollTop = element.scrollHeight;
    const top = element.getBoundingClientRect().top;
    const anchor = [...element.querySelectorAll<HTMLElement>('.vocabulary-term')].find(card => card.getBoundingClientRect().bottom > top + 24)!;
    return { id: anchor.id, offset: anchor.getBoundingClientRect().top - top, scroll: element.scrollTop };
  });
  await expect.poll(() => page.locator('.vocabulary-term').count()).toBeGreaterThanOrEqual(12);
  const after = await pane.evaluate((element, id) => document.getElementById(id)!.getBoundingClientRect().top - element.getBoundingClientRect().top, before.id);
  expect(before.scroll).toBeGreaterThan(0);
  expect(Math.abs(after - before.offset)).toBeLessThanOrEqual(1);
  await pane.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => page.locator('.vocabulary-term').count()).toBeGreaterThanOrEqual(18);
  await pane.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(page.locator('.vocabulary-term')).toHaveCount(21);
  await expect(page.locator('.vocabulary-pagination')).toBeEmpty();
  await page.locator('[data-slot="sidebar-inner"] a[href="#kerning"]').click();
  await expect(kerningToggle).toHaveAttribute('aria-selected', 'true');
  await testInfo.attach('Incremental loading evidence', { body: JSON.stringify({ cards: 21, scrollAfterFirstAppend: after }), contentType: 'application/json' });
});

test('all five languages expose localized content, metadata and stable term links', async ({ page, request }, testInfo) => {
  const evidence = [];
  for (const locale of locales) {
    const messages = JSON.parse(readFileSync(`src/messages/vocabulary/${locale}.json`, 'utf8'));
    const url = localePath(locale, '/vocabulary/typography');
    expect((await request.get(url)).status()).toBe(200);
    await page.goto(`${url}#subscript`);
    await expect(page.locator('html')).toHaveAttribute('lang', htmlLanguages[locale]);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages.typography);
    await expect(page.locator('#subscript')).toBeInViewport();
    await expect(page.locator('.vocabulary-term')).toHaveCount(21);
    const source = page.locator('[data-slot="sidebar-header"]').getByRole('link', { name: messages.source, exact: true });
    await expect(source).toHaveAttribute('href', 'https://index.how/to/articulate');
    await expect(source).toHaveAttribute('title', messages.source);
    await expect(page.locator('#kerning .vocabulary-definition')).toHaveText(messages.terms.kerning.description);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${url}$`));
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(6);
    await page.locator('.language-picker summary').click();
    const next = locales[(locales.indexOf(locale) + 1) % locales.length];
    await page.locator(`.language-options a[hreflang="${htmlLanguages[next]}"]`).click();
    await expect(page).toHaveURL(`${localePath(next, '/vocabulary/typography')}#subscript`);
    await expect(page.locator('#subscript')).toBeInViewport();
    const entry = await request.get(localePath(locale, '/vocabulary'));
    expect(new URL(entry.url()).pathname).toBe(url);
    evidence.push({ locale, url, title: messages.typography, terms: 21 });
  }
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const locale of locales) expect(sitemap).toContain(localePath(locale, '/vocabulary/typography'));
  expect((await request.get('/vocabulary/unpublished')).status()).toBe(404);
  await testInfo.attach('Localized dictionary routes', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('manual loading works without intersection observation and moves keyboard focus to new content', async ({ page }, testInfo) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'IntersectionObserver', { value: undefined }); });
  await page.goto(path);
  const load = page.getByRole('button', { name: '加载更多', exact: true });
  await load.focus();
  await load.press('Enter');
  await expect(page.locator('.vocabulary-term')).toHaveCount(12);
  await expect(page.locator('#optical-kerning')).toBeFocused();
  await load.click();
  await expect(page.locator('.vocabulary-term')).toHaveCount(18);
  await load.click();
  await expect(page.locator('.vocabulary-term')).toHaveCount(21);
  await expect(load).toHaveCount(0);
  await testInfo.attach('Manual loading fallback', { body: await page.screenshot(), contentType: 'image/png' });
});

for (const width of [390, 320]) {
  test(`mobile directory and all cards fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(path);
    const trigger = page.getByRole('button', { name: '打开词典目录' });
    await trigger.click();
    const sheet = page.locator('[data-mobile="true"]');
    const source = sheet.locator('[data-slot="sidebar-header"]').getByRole('link', { name: '术语参考：Index', exact: true });
    await expect(source).toBeVisible();
    await expect(source).toHaveAttribute('href', 'https://index.how/to/articulate');
    await source.focus();
    await expect(source).toBeFocused();
    await testInfo.attach(`Mobile source icon ${width}px`, { body: await sheet.locator('[data-slot="sidebar-header"]').screenshot(), contentType: 'image/png' });
    const search = sheet.getByRole('searchbox');
    await search.fill('subscript');
    await sheet.getByRole('link', { name: '下标', exact: true }).click();
    await expect(sheet).not.toBeVisible();
    await expect(page.locator('#subscript')).toBeInViewport();
    await trigger.click();
    await expect(search).toHaveValue('subscript');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    const overflow = await page.locator('.vocabulary-term').evaluateAll(cards => cards.filter(card => card.scrollWidth > card.clientWidth + 1).map(card => card.id));
    expect(overflow).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await testInfo.attach(`Typography ${width}px`, { body: await page.screenshot(), contentType: 'image/png' });
  });
}

test('all definitions and native navigation remain readable without JavaScript', async ({ browser, baseURL }, testInfo) => {
  const messages = JSON.parse(readFileSync('src/messages/vocabulary/zh.json', 'utf8'));
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.locator('.vocabulary-term, .vocabulary-static')).toHaveCount(21);
    await page.locator('.vocabulary-native-directory summary').click();
    await page.locator('.vocabulary-native-directory a[href="#subscript"]').click();
    await expect(page.locator('.vocabulary-heading')).not.toBeInViewport();
    await expect(page.locator('#subscript')).toBeInViewport();
    await expect(page.locator('#subscript')).toContainText(messages.terms.subscript.description);
    await testInfo.attach('Dictionary without JavaScript', { body: await page.screenshot(), contentType: 'image/png' });
  } finally { await context.close(); }
});
