import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.skip(process.env.CONTENT_TEST === '1', 'Uses published course links.');
const source = '/zh/courses/llm-101/why-model-answers-vary';
const token = '/zh/courses/llm-101/what-is-a-token';
const generation = '/zh/courses/llm-101/what-a-language-model-does';
const panes = (page: Page) => page.locator('[data-slot="reading-pane"]');
const primary = (page: Page) => page.locator('[data-slot="reading-primary"]');

async function capture(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

test('internal links in both articles skip previews and still open beside the source', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 960 });
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/link-preview')) requests.push(request.url()); });
  await page.goto(source);
  await page.clock.install();
  const link = primary(page).locator(`.course-prose a[href="${token}"]`).first();
  await link.hover();
  await page.clock.runFor(600);
  await link.focus();
  await page.clock.runFor(600);
  await expect(link).not.toHaveAttribute('data-link-preview');
  await expect(page.locator('[data-slot="link-preview"]')).toHaveCount(0);
  expect(requests).toEqual([]);
  await link.click();
  await expect(panes(page)).toHaveCount(1);
  await page.clock.runFor(300);
  const reference = panes(page).locator(`.course-prose a[href="${generation}"]`).first();
  await reference.hover();
  await page.clock.runFor(600);
  await reference.focus();
  await page.clock.runFor(600);
  await expect(reference).not.toHaveAttribute('data-link-preview');
  await expect(page.locator('[data-slot="link-preview"]')).toHaveCount(0);
  expect(requests).toEqual([]);
  await capture(page, 'side-reading-links-without-preview');
  await reference.click();
  await expect(panes(page).locator('article > h2')).toHaveText('大语言模型是如何生成回答的？');
  await expect(page.locator('[data-slot="lesson-reader"] article')).toHaveCount(2);
  expect(new URL(page.url()).pathname).toBe(source);
  await test.info().attach('Article preview requests', { body: JSON.stringify(requests), contentType: 'application/json' });
});

test('lesson references replace the side article while preserving the source, history, and close focus', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 960 });
  await page.goto(source);
  const original = primary(page).locator('[data-slot="lesson-region"]');
  const link = primary(page).locator(`.course-prose a[href="${token}"]`).first();
  await link.scrollIntoViewIfNeeded();
  await original.evaluate(element => { element.dataset.retained = 'true'; });
  const scrollTop = await original.evaluate(element => element.scrollTop);
  await link.click();
  await expect(panes(page)).toHaveCount(1);
  const first = panes(page).first();
  await expect(first.locator('article h2').first()).toContainText('Token');
  await expect(original).toHaveAttribute('data-retained', 'true');
  expect(await original.evaluate(element => element.scrollTop)).toBe(scrollTop);
  const referenceLink = first.locator(`.course-prose a[href="${generation}"]`);
  await referenceLink.scrollIntoViewIfNeeded();
  const referenceScroll = await first.locator('[data-slot="reading-scroll"]').evaluate(element => element.scrollTop);
  await referenceLink.click();
  await expect(panes(page)).toHaveCount(1);
  await expect(first.locator('article h2').first()).toHaveText('大语言模型是如何生成回答的？');
  await expect(first.locator(':scope > header')).toHaveCount(0);
  await expect(first.getByRole('button', { name: '关闭侧栏' })).toBeInViewport();
  await capture(page, 'two-articles-with-floating-close');
  await page.goBack();
  await expect(panes(page)).toHaveCount(1);
  await expect(first.locator('article h2').first()).toContainText('Token');
  await expect.poll(() => first.locator('[data-slot="reading-scroll"]').evaluate(element => element.scrollTop)).toBe(referenceScroll);
  await page.goForward();
  await expect(panes(page)).toHaveCount(1);
  await expect(first.locator('article h2').first()).toHaveText('大语言模型是如何生成回答的？');
  await page.keyboard.press('Escape');
  await expect(panes(page)).toHaveCount(0);
  await expect(link).toBeFocused();
  expect(await original.evaluate(element => element.scrollTop)).toBe(scrollTop);
  await expect(page.locator('#main-content')).toHaveCount(1);
  await capture(page, 'source-reading-position-restored');
});

test('references support course overviews, cross-course content, refresh, and a two-article limit', async ({ page }) => {
  await page.goto('/zh/courses/agent-101/about-this-course');
  const link = primary(page).locator('.course-prose a[href="/zh/courses/coding-101/about-this-course"]').first();
  await link.click();
  await expect(panes(page)).toHaveCount(1);
  await expect(panes(page).first().locator('article')).toContainText('LLM 101');
  await panes(page).first().locator('.course-prose a[href="/zh/courses/llm-101"]').click();
  await expect(panes(page)).toHaveCount(1);
  await expect(panes(page).last().locator('.course-directory')).toBeVisible();
  await page.reload();
  await expect(panes(page)).toHaveCount(1);
  await expect(panes(page).last().locator('.course-directory')).toBeVisible();
  await expect(panes(page).last().locator(':scope > header')).toHaveCount(0);
  await capture(page, 'side-course-overview-with-floating-close');
});

for (const width of [320, 390, 1280]) {
  test(`reading panes fit ${width}px and support keyboard dismissal with reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(source);
    const link = primary(page).locator(`.course-prose a[href="${token}"]`).first();
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(panes(page)).toHaveCount(1);
    const pane = panes(page).first();
    const close = pane.getByRole('button', { name: '关闭侧栏' });
    await expect(close).toBeInViewport();
    const bounds = (await close.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await pane.evaluate(element => element.getAnimations().length)).toBe(0);
    const accessibility = await new AxeBuilder({ page }).include('[data-slot="reading-pane"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await capture(page, `reading-pane-${width}`);
    await page.keyboard.press('Escape');
    await expect(panes(page)).toHaveCount(0);
    await expect(link).toBeFocused();
  });
}

test('links retain native destinations and modifier behavior', async ({ page, context }) => {
  await page.goto(source);
  const link = primary(page).locator(`.course-prose a[href="${token}"]`).first();
  await expect(link).toHaveAttribute('href', token);
  const popup = context.waitForEvent('page');
  await link.click({ modifiers: ['ControlOrMeta'] });
  const opened = await popup;
  await opened.waitForLoadState('domcontentloaded');
  await expect(opened).toHaveURL(token);
  await expect(opened.getByRole('heading', { level: 1 })).toContainText('Token');
  await opened.close();
  await expect(panes(page)).toHaveCount(0);
  await expect(page).toHaveURL(source);
  await capture(page, 'native-link-destination');
});

test('links without JavaScript navigate directly to the lesson', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(source);
    await page.locator(`.course-prose a[href="${token}"]`).first().click();
    await expect(page).toHaveURL(token);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Token');
    await capture(page, 'native-reading-without-javascript');
  } finally { await context.close(); }
});

test('course navigation leaves side reading and opens the selected lesson', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(source);
  await primary(page).locator(`.course-prose a[href="${token}"]`).first().click();
  await expect(panes(page)).toHaveCount(1);
  await page.locator(`[data-slot="sidebar-container"] a[href="${generation}"]`).click();
  await expect(page).toHaveURL(generation);
  await expect(panes(page)).toHaveCount(0);
  await expect(primary(page).locator('article h1')).toHaveText('大语言模型是如何生成回答的？');
  expect(await primary(page).locator('[data-slot="lesson-region"]').evaluate(element => element.scrollTop)).toBe(0);
  await capture(page, 'normal-course-navigation-after-side-reading');
});
