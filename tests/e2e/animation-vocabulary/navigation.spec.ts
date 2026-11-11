import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { locales, htmlLanguages } from '../../../src/lib/i18n/config';
import { localePath } from '../../../src/lib/i18n/routing';

const route = '/animation-vocabulary/entrances-and-exits';
const path = `/zh${route}`;
test.use({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });

test('animation and design dictionaries are sibling resources on the homepage and in lessons', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/zh?view=resources');
  const resources = page.getByRole('region', { name: '学习资料', exact: true });
  const animation = resources.getByRole('link', { name: '动画词典', exact: true });
  await expect(resources.getByRole('link', { name: '设计词典', exact: true })).toBeVisible();
  await expect(animation).toHaveAttribute('href', path);
  await expect(animation.locator('.optical-disc-meta')).toHaveText('6 词条');
  await testInfo.attach('Sibling resource discs', { body: await resources.screenshot(), contentType: 'image/png' });
  await animation.focus();
  await animation.press('Enter');
  await expect(page).toHaveURL(path);
  await expect(page.locator('.mac-window-heading')).toHaveText('动画词典');
  await expect(page.locator('[data-slot="site-window"]')).toHaveAttribute('data-variant', 'reading');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('入场与退场');
  await expect(page.locator('.vocabulary-term')).toHaveCount(6);
  await testInfo.attach('Animation dictionary desktop', { body: await page.screenshot(), contentType: 'image/png' });
  await page.locator('.site-header-logo').click();
  await expect(page).toHaveURL('/zh');
  await page.goto('/zh/courses/getting-started/about-this-course');
  const lessonResources = page.locator('[data-component="resource-disks"]');
  await expect(lessonResources.getByRole('link', { name: '设计词典', exact: true })).toHaveCount(1);
  await expect(lessonResources.getByRole('link', { name: '动画词典', exact: true })).toHaveAttribute('href', path);
  expect(errors).toEqual([]);
});

test('search, anchors, history and source links stay within the animation dictionary', async ({ page }, testInfo) => {
  await page.goto(path);
  const directory = page.locator('[data-slot="sidebar-inner"]');
  await expect(directory.getByRole('link', { name: '术语参考：animations.dev', exact: true })).toHaveAttribute('href', 'https://animations.dev/vocabulary#entrances-and-exits');
  const search = directory.getByRole('searchbox');
  await search.fill('REVEAL');
  await expect(directory.getByRole('status')).toHaveText('1 个结果');
  await directory.getByRole('link', { name: '揭示', exact: true }).click();
  await expect(page).toHaveURL(`${path}#reveal`);
  await expect(page.locator('#reveal')).toBeFocused();
  await page.locator('#reveal').getByRole('button', { name: '慢速播放' }).click();
  await search.fill('淡入');
  await directory.getByRole('link', { name: '淡入 / 淡出', exact: true }).click();
  await expect(page).toHaveURL(`${path}#fade`);
  await page.goBack();
  await expect(page.locator('#reveal')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('#reveal').getByRole('button', { name: '慢速播放' })).toHaveAttribute('aria-pressed', 'true');
  await search.fill('kerning');
  await expect(directory.getByRole('status')).toHaveText('0 个结果');
  await directory.getByRole('button', { name: '清除搜索' }).click();
  await expect(directory.locator('a[href^="#"]')).toHaveCount(6);
  await testInfo.attach('Animation directory and history', { body: await page.screenshot(), contentType: 'image/png' });
});

for (const width of [1440, 390, 320]) {
  test(`all six examples and directory controls fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto(path);
    await expect(page.locator('.vocabulary-term')).toHaveCount(6);
    await expect(page.locator('.entrance-demo[data-ready="true"]')).toHaveCount(6);
    if (width < 961) {
      await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
      const directory = page.locator('[data-mobile="true"]');
      await directory.getByRole('link', { name: '进入 / 退出', exact: true }).click();
      await expect(page.locator('#enter-exit')).toBeInViewport();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const overflow = await page.locator('.vocabulary-term, .entrance-controls').evaluateAll(elements =>
      elements.filter(element => element.scrollWidth > element.clientWidth + 1).map(element => element.className));
    expect(overflow).toEqual([]);
    const controls = await page.locator('.entrance-controls button, .entrance-controls select').evaluateAll(elements =>
      elements.map(element => ({ height: element.getBoundingClientRect().height, width: element.getBoundingClientRect().width, label: element.textContent })));
    expect(controls.every(control => control.height >= 44 && control.width >= 44)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).include('#main-content').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.locator('[data-slot="vocabulary-scroll"]').evaluate(element => { element.scrollTop = 0; });
    await testInfo.attach(`Animation layout ${width}px`, { body: await page.screenshot(), contentType: 'image/png' });
    await testInfo.attach('Control geometry', { body: JSON.stringify(controls, null, 2), contentType: 'application/json' });
  });
}

test('five languages publish localized cards, metadata, resources and stable term anchors', async ({ page, request }, testInfo) => {
  const evidence = [];
  for (const [index, locale] of locales.entries()) {
    const copy = JSON.parse(readFileSync(`src/messages/animation-vocabulary/${locale}.json`, 'utf8'));
    await page.goto(`${localePath(locale, route)}#reveal`);
    await expect(page.locator('html')).toHaveAttribute('lang', htmlLanguages[locale]);
    await expect(page).toHaveTitle(new RegExp(copy.title));
    await expect(page.locator('.mac-window-heading')).toHaveText(copy.title);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy['entrances-and-exits']);
    await expect(page.locator('#reveal .vocabulary-definition')).toHaveText(copy.terms.reveal.description);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${localePath(locale, route)}$`));
    const next = locales[(index + 1) % locales.length];
    await page.locator('.language-picker summary').click();
    await page.locator(`.language-picker a[hreflang="${htmlLanguages[next]}"]`).click();
    await expect(page).toHaveURL(`${localePath(next, route)}#reveal`);
    await expect(page.locator('#reveal')).toHaveAttribute('data-selected', 'true');
    await page.context().clearCookies();
    await page.goto(`${localePath(locale)}?view=resources`);
    await expect(page.locator('[data-resource-disk="animation-vocabulary"]')).toHaveAccessibleName(copy.title);
    const entry = await request.get(localePath(locale, '/animation-vocabulary'));
    expect(new URL(entry.url()).pathname).toBe(localePath(locale, route));
    evidence.push({ locale, title: copy.title, route: localePath(locale, route) });
  }
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const locale of locales) expect(sitemap).toContain(localePath(locale, route));
  expect((await request.get('/animation-vocabulary/unpublished')).status()).toBe(404);
  await testInfo.attach('Localized animation routes', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('definitions and native navigation remain available without JavaScript', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 960 } });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.locator('.vocabulary-term')).toHaveCount(6);
    await expect(page.locator('.entrance-controls').first()).not.toBeVisible();
    await page.locator('.vocabulary-native-directory summary').click();
    await page.locator('.vocabulary-native-directory a[href="#enter-exit"]').click();
    await expect(page).toHaveURL(`${path}#enter-exit`);
    await expect(page.locator('#enter-exit')).toBeInViewport();
    await expect(page.locator('#enter-exit .vocabulary-definition')).toContainText('退出时先完成动作');
    await testInfo.attach('Animation dictionary without JavaScript', { body: await page.screenshot(), contentType: 'image/png' });
  } finally { await context.close(); }
});
