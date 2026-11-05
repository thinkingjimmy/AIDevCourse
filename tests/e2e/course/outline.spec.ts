import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { localePath } from '../../../src/lib/i18n/routing';

const lesson = '/zh/courses/llm-101/why-model-answers-vary';
const tocSelector = '[data-slot="lesson-toc"]';
const markerSelector = '[data-slot="lesson-toc-marker"]';
const titleSelector = '[data-slot="lesson-toc-title"]';
test.beforeEach(() => { test.skip(process.env.CONTENT_TEST === '1', 'Uses published lessons.'); });

async function capture(page: Page, name: string) {
  const geometry = await page.evaluate(() => {
    function box(element: Element | null) {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }
    return {
      viewport: { width: innerWidth, height: innerHeight },
      scrollTop: document.querySelector('[data-slot="lesson-region"]')!.scrollTop,
      article: box(document.querySelector('article')),
      toc: box(document.querySelector('[data-slot="lesson-toc"]')),
      title: box(document.querySelector('[data-slot="lesson-toc-title"]')),
      markers: [...document.querySelectorAll('[data-slot="lesson-toc-marker"]')].map(box),
      labels: [...document.querySelectorAll('[data-slot="lesson-toc-label"]')].map(box),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(geometry.overflow).toBe(false);
  await test.info().attach(`${name} geometry`, { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

test('lesson outline previews neighboring markers without moving the article or changing the current section', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(lesson);
  await page.evaluate(() => document.fonts.ready);
  const toc = page.locator(tocSelector);
  const links = toc.locator('a');
  const markers = toc.locator(markerSelector);
  const widths = () => markers.evaluateAll(elements => elements.map(element => Math.round(element.getBoundingClientRect().width)));
  await expect(toc.locator('[aria-current="location"]')).toHaveAttribute('href', (await links.first().getAttribute('href'))!);
  await expect.poll(widths).toEqual(Array(await links.count()).fill(12));
  await expect(page.locator(titleSelector)).toHaveCount(0);
  const resting = (await toc.boundingBox())!;
  const pane = page.locator('[data-slot="lesson-region"]');
  const paneBox = (await pane.boundingBox())!;
  expect(resting.y + resting.height / 2).toBeCloseTo(paneBox.y + paneBox.height / 2, 0);
  const rows = await links.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
  expect(rows.every(height => height === 20)).toBe(true);
  const article = await page.locator('article').boundingBox();
  expect(resting.x + resting.width).toBeLessThanOrEqual(article!.x);
  const scrollTop = await pane.evaluate(element => element.scrollTop);
  await capture(page, 'lesson-outline-collapsed');

  await links.nth(3).hover();
  const title = page.locator(titleSelector);
  await expect(title).toBeVisible();
  await expect(page.getByRole('tooltip')).toHaveText((await links.nth(3).textContent())!);
  await expect.poll(widths).toEqual([20, 28, 40, 52, 40, 28, 20]);
  await expect(toc.locator('[aria-current="location"]')).toHaveAttribute('href', (await links.first().getAttribute('href'))!);
  await expect(toc.locator('[aria-current="location"]').locator(markerSelector)).toHaveCSS('background-color', 'rgb(49, 86, 75)');
  await expect(title).toHaveCSS('box-shadow', /4px 4px 0px 0px/);
  await expect(title).toHaveCSS('border-top-width', '1px');
  await expect(title).toHaveCSS('border-top-color', 'rgb(49, 86, 75)');
  await expect(title).toHaveCSS('color', 'rgb(49, 86, 75)');
  await expect(title).toHaveCSS('border-radius', '4px');
  await expect(title).toHaveCSS('background-color', 'rgb(253, 253, 252)');
  await expect(title).toHaveAttribute('data-side', 'right');
  expect((await title.boundingBox())!.width).toBeLessThanOrEqual(320);
  expect((await title.boundingBox())!.x).toBeGreaterThanOrEqual((await links.nth(3).boundingBox())!.x + 52);
  expect(await page.locator('article').boundingBox()).toEqual(article);
  expect(await pane.evaluate(element => element.scrollTop)).toBe(scrollTop);
  expect(new URL(page.url()).hash).toBe('');
  await capture(page, 'lesson-outline-hover');

  await page.mouse.move(1000, 100);
  await expect(title).toHaveCount(0);
  await expect.poll(widths).toEqual(Array(await links.count()).fill(12));
  expect(await page.locator('article').boundingBox()).toEqual(article);
});

test('lesson outline supports keyboard previews and reduced motion', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(lesson);
  const toc = page.locator(tocSelector);
  const links = toc.locator('a');
  await expect(toc.locator('[aria-current="location"]')).toHaveCount(1);
  await links.first().focus();
  // Safari includes native links in sequential navigation with Option-Tab.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(links.nth(1)).toBeFocused();
  await expect(page.locator(titleSelector)).toBeVisible();
  await expect(page.getByRole('tooltip')).toHaveText((await links.nth(1).textContent())!);
  await expect(links.nth(1)).toHaveCSS('outline-style', 'solid');
  await expect(links.nth(1)).toHaveCSS('outline-color', 'rgb(49, 86, 75)');
  await expect.poll(() => links.nth(1).locator(markerSelector).evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(52);
  await capture(page, 'lesson-outline-keyboard');
  const accessibility = await new AxeBuilder({ page }).include(tocSelector).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.locator(titleSelector)).toHaveCount(0);
  await expect(links.nth(1)).toBeFocused();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await links.nth(3).focus();
  await expect(page.locator(titleSelector)).toBeVisible();
  await expect(links.nth(3).locator(markerSelector)).toHaveCSS('transition-property', 'none');
  await page.keyboard.press('Enter');
  await expect(page.locator('article h2').nth(3)).toBeInViewport();
  await expect(links.nth(3)).toHaveAttribute('aria-current', 'location');
  const centered = (await toc.boundingBox())!;
  const pane = (await page.locator('[data-slot="lesson-region"]').boundingBox())!;
  expect(centered.y + centered.height / 2).toBeCloseTo(pane.y + pane.height / 2, 0);
  await capture(page, 'lesson-outline-reduced-motion');
});

test('lesson outline omits the empty right rail on a lesson without notes', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 960 });
  await page.goto('/zh/courses/coding-101/what-is-json');
  await expect(page.locator(tocSelector)).toBeVisible();
  await expect(page.locator('[data-slot="lesson-rail"]')).toHaveCount(0);
  expect((await page.locator('article').boundingBox())!.width).toBeCloseTo(816, 0);
  expect((await page.locator('[data-slot="lesson-reading-group"]').boundingBox())!.width).toBeCloseTo(816, 0);
  await capture(page, 'lesson-outline-without-notes');
});

test('lesson outline remains usable while right-hand notes scroll through the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 960 });
  await page.goto('/zh/courses/llm-101/what-a-language-model-does');
  const toc = page.locator(tocSelector);
  const note = page.locator('[data-jimmy-note-card="streaming-answer"]');
  await expect(note).toBeVisible();
  const article = (await page.locator('article').boundingBox())!;
  await page.locator('[data-jimmy-note-anchor="streaming-answer"]').evaluate(element => element.scrollIntoView({ block: 'center' }));
  await expect(toc).toBeVisible();
  expect(await toc.evaluate(element => (element as HTMLElement).inert)).toBe(false);
  expect((await note.boundingBox())!.width).toBeCloseTo(336, 0);
  const scrolled = (await page.locator('article').boundingBox())!;
  expect(scrolled.x).toBe(article.x);
  expect(scrolled.width).toBe(article.width);
  await capture(page, 'lesson-outline-with-right-note');
  await toc.locator('a').nth(1).click();
  await expect(page.locator('article h2').nth(1)).toBeInViewport();
  await expect(toc.locator('a').nth(1)).toHaveAttribute('aria-current', 'location');
});

test('lesson outline stays beside the sidebar in narrow desktop windows and follows collapse', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(lesson);
  const toc = page.locator(tocSelector);
  const toggle = page.locator('[data-slot="sidebar-trigger"]');
  const offset = async () => {
    const sidebar = (await page.locator('[data-slot="sidebar-container"]').boundingBox())!;
    return (await toc.boundingBox())!.x - sidebar.x - sidebar.width;
  };
  await expect(toc).toBeVisible();
  await expect(page.locator('[data-slot="lesson-rail"]')).toBeHidden();
  expect(await offset()).toBeCloseTo(8, 0);
  await toc.locator('a').nth(3).hover();
  await expect(page.locator(titleSelector)).toBeVisible();
  await capture(page, 'lesson-outline-narrow-desktop-hover');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(offset).toBeCloseTo(8, 0);
  await expect(toc).toBeVisible();
  await capture(page, 'lesson-outline-collapsed-sidebar');
  await toggle.click();
  await page.setViewportSize({ width: 961, height: 900 });
  await expect(toc).toBeVisible();
  await expect.poll(offset).toBeCloseTo(8, 0);
  await toc.locator('a').first().hover();
  await expect(page.locator(titleSelector)).toBeVisible();
  await capture(page, 'lesson-outline-smallest-desktop');
  await page.setViewportSize({ width: 960, height: 900 });
  await expect(toc).toBeHidden();
  await expect(page.locator(titleSelector)).toHaveCount(0);
});

test('lesson outline shows complete titles by default when the left gutter is wide enough', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 2048, height: 960 });
  await page.goto(lesson);
  await page.evaluate(() => document.fonts.ready);
  const toc = page.locator(tocSelector);
  const links = toc.locator('a');
  await expect(toc.locator('[aria-current="location"]')).toHaveCount(1);
  await expect(toc.locator('[data-slot="lesson-toc-label"]').first()).toHaveCSS('position', 'static');
  await expect(toc.locator(markerSelector).first()).toBeHidden();
  const article = (await page.locator('article').boundingBox())!;
  const outline = (await toc.boundingBox())!;
  expect(outline.width).toBeCloseTo(224, 0);
  expect(article.x - outline.x - outline.width).toBeGreaterThanOrEqual(16);
  const pane = (await page.locator('[data-slot="lesson-region"]').boundingBox())!;
  expect(outline.y + outline.height / 2).toBeCloseTo(pane.y + pane.height / 2, 0);
  await expect(toc.locator('[aria-current="location"]')).toHaveCSS('color', 'rgb(49, 86, 75)');
  await expect(toc.locator('[aria-current="location"]')).toHaveCSS('font-weight', '500');
  await links.nth(3).hover();
  await expect(page.locator(titleSelector)).toHaveCount(0);
  expect(await page.locator('article').boundingBox()).toEqual(article);
  await links.first().focus();
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(links.nth(1)).toBeFocused();
  await expect(page.locator(titleSelector)).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).include(tocSelector).analyze();
  expect(accessibility.violations).toEqual([]);
  await capture(page, 'lesson-outline-expanded-titles');

  await page.setViewportSize({ width: 2048, height: 240 });
  await links.last().click();
  await expect(links.last()).toHaveAttribute('aria-current', 'location');
  await expect(links.last()).toBeInViewport();
  expect(await toc.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await capture(page, 'lesson-outline-expanded-short-viewport');
});

test('lesson outline changes between titles and markers without losing focus or retaining a floating title', async ({ page }) => {
  await page.setViewportSize({ width: 2048, height: 960 });
  await page.goto(lesson);
  const toc = page.locator(tocSelector);
  const link = toc.locator('a').nth(3);
  const label = link.locator('[data-slot="lesson-toc-label"]');
  await expect(toc.locator('[aria-current="location"]')).toHaveCount(1);
  await link.focus();
  await expect(label).toHaveCSS('position', 'static');
  await expect(page.locator(titleSelector)).toHaveCount(0);
  const pane = page.locator('[data-slot="lesson-region"]');
  const originalScroll = await pane.evaluate(element => element.scrollTop);
  await page.setViewportSize({ width: 1280, height: 960 });
  await expect(label).toHaveCSS('position', 'absolute');
  await expect(link).toBeFocused();
  await expect(link.locator(markerSelector)).toBeVisible();
  await link.hover();
  await expect(page.locator(titleSelector)).toBeVisible();
  await capture(page, 'lesson-outline-responsive-markers');
  await page.setViewportSize({ width: 2048, height: 960 });
  await expect(label).toHaveCSS('position', 'static');
  await expect(link).toBeFocused();
  await expect(link.locator(markerSelector)).toBeHidden();
  await expect(page.locator(titleSelector)).toHaveCount(0);
  expect(await pane.evaluate(element => element.scrollTop)).toBe(originalScroll);
  await capture(page, 'lesson-outline-responsive-titles');
});

for (const scenario of [
  { name: 'with notes', path: lesson, readerRem: 102 },
  { name: 'without notes', path: '/zh/courses/coding-101/what-is-json', readerRem: 79 },
]) {
  test(`lesson outline uses the available gutter ${scenario.name} and follows sidebar resizing`, async ({ page }) => {
    const threshold = (sidebarRem: number, rootSize = 16) => 26 + (sidebarRem + scenario.readerRem) * rootSize;
    await page.setViewportSize({ width: threshold(17) - 1, height: 960 });
    await page.goto(scenario.path);
    const toc = page.locator(tocSelector);
    const label = toc.locator('[data-slot="lesson-toc-label"]').first();
    await expect(label).toHaveCSS('position', 'absolute');
    await page.setViewportSize({ width: threshold(17), height: 960 });
    await expect(label).toHaveCSS('position', 'static');
    const article = (await page.locator('article').boundingBox())!;
    const expanded = (await toc.boundingBox())!;
    expect(article.x - expanded.x - expanded.width).toBeGreaterThanOrEqual(15.9);
    await capture(page, `lesson-outline-gutter-${scenario.name.replaceAll(' ', '-')}`);
    await page.locator('[data-slot="sidebar-trigger"]').click();
    await page.setViewportSize({ width: threshold(3) - 1, height: 960 });
    await expect(label).toHaveCSS('position', 'absolute');
    await page.setViewportSize({ width: threshold(3), height: 960 });
    await expect(label).toHaveCSS('position', 'static');
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
    await expect(label).toHaveCSS('position', 'absolute');
    await page.setViewportSize({ width: threshold(3, 20), height: 960 });
    await expect(label).toHaveCSS('position', 'static');
    const enlarged = (await toc.boundingBox())!;
    expect(enlarged.width).toBeCloseTo(280, 0);
    expect((await page.locator('article').boundingBox())!.x - enlarged.x - enlarged.width).toBeGreaterThanOrEqual(19.9);
    await capture(page, `lesson-outline-enlarged-${scenario.name.replaceAll(' ', '-')}`);
  });
}

test('lesson outline shows wide titles and native anchors without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 2048, height: 960 } });
  try {
    const page = await context.newPage();
    await page.goto(lesson);
    const toc = page.locator(tocSelector);
    await expect(toc.locator('[data-slot="lesson-toc-label"]').first()).toHaveCSS('position', 'static');
    await expect(toc.locator(markerSelector).first()).toBeHidden();
    await expect(toc.locator('[aria-current]')).toHaveCount(0);
    await toc.locator('a').last().click();
    await expect(page.locator('article h2').last()).toBeInViewport();
    await capture(page, 'lesson-outline-expanded-no-js');
  } finally { await context.close(); }
});

for (const locale of ['en', 'ja', 'fr', 'es'] as const) {
  test(`lesson outline leaves no empty columns on the ${locale} lesson without headings`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 960 });
    await page.goto(localePath(locale, '/courses/llm-101/what-a-language-model-does'));
    const messages = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
    await expect(page.getByRole('navigation', { name: messages.Course.onThisPage, exact: true })).toHaveCount(0);
    await expect(page.locator('[data-slot="lesson-aside"], [data-slot="lesson-rail"]')).toHaveCount(0);
    expect((await page.locator('article').boundingBox())!.width).toBeCloseTo(816, 0);
    expect((await page.locator('[data-slot="lesson-reading-group"]').boundingBox())!.width).toBeCloseTo(816, 0);
    await capture(page, `lesson-outline-no-headings-${locale}`);
  });
}
