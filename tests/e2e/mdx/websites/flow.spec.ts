import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published Coding 101 lesson.');
const lesson = '/zh/courses/coding-101/frontend-backend-and-database';
const destination = 'https://jimmywong.dev/en';
const preview = (page: Page) => page.locator('[data-component="website-preview"]').first();

async function capture(page: Page, name: string) {
  await test.info().attach(name, { body: await preview(page).screenshot(), contentType: 'image/png' });
}

test('the requested section contains a browser frame with a local screenshot and no live embed', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const remoteRequests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).hostname.endsWith('jimmywong.dev')) remoteRequests.push(request.url()); });
  await page.goto(lesson);
  const frame = preview(page);
  await frame.scrollIntoViewIfNeeded();
  await expect(frame.getByRole('img')).toHaveAttribute('alt', /Jimmy/);
  await expect.poll(() => frame.getByRole('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(frame.getByRole('img')).toHaveAttribute('width', '1920');
  await expect(frame.getByRole('img')).toHaveAttribute('height', '1680');
  await expect(frame.locator('[data-slot="website-toolbar"]')).toHaveAttribute('href', destination);
  await expect(frame.locator('[data-slot="website-link"]')).toHaveAttribute('target', '_blank');
  await expect(frame.locator('[data-slot="website-address"]')).toHaveText('jimmywong.dev/en');
  await expect(frame.locator('iframe, button, [data-slot="link-preview"]')).toHaveCount(0);
  const position = await frame.evaluate(element => {
    const preceding = [...element.parentElement!.children].slice(0, [...element.parentElement!.children].indexOf(element));
    return { heading: preceding.filter(node => node.tagName === 'H2').at(-1)?.textContent, previous: element.previousElementSibling?.textContent };
  });
  expect(position.heading).toContain('五、所有网站都必须要有这些吗？');
  expect(position.previous).toContain('比如我的个人网站：');
  expect(remoteRequests).toEqual([]);
  const accessibility = await new AxeBuilder({ page }).include('[data-component="website-preview"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await capture(page, 'Website preview in section five');
  await test.info().attach('Website preview placement and requests', { body: JSON.stringify({ position, remoteRequests, accessibility }, null, 2), contentType: 'application/json' });
});

test('scrolling the screenshot keeps the browser bar and lesson in place', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(lesson);
  const frame = preview(page);
  await frame.scrollIntoViewIfNeeded();
  const viewport = frame.locator('[data-slot="website-viewport"]');
  const lessonScroll = page.locator('[data-slot="reading-primary"] [data-slot="lesson-region"]');
  const sourceTop = await lessonScroll.evaluate(element => element.scrollTop);
  const toolbar = (await frame.locator('[data-slot="website-toolbar"]').boundingBox())!;
  await expect(viewport).toHaveCSS('height', '400px');
  await viewport.hover();
  await page.mouse.wheel(0, 280);
  await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(100);
  expect(await lessonScroll.evaluate(element => element.scrollTop)).toBe(sourceTop);
  expect((await frame.locator('[data-slot="website-toolbar"]').boundingBox())!.y).toBeCloseTo(toolbar.y, 0);
  await capture(page, 'Website preview scrolled inside its frame');
  await viewport.evaluate(element => { element.scrollTop = 0; });
  await viewport.focus();
  await page.keyboard.press('PageDown');
  await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(100);
  expect(await lessonScroll.evaluate(element => element.scrollTop)).toBe(sourceTop);
  await test.info().attach('Independent website scrolling', { body: JSON.stringify({ sourceTop, viewportTop: await viewport.evaluate(element => element.scrollTop), toolbar }, null, 2), contentType: 'application/json' });
});

test('the component preview reuses the screenshot and localizes the new-tab label', async ({ page }) => {
  await page.goto('/design/components?lang=en');
  const frame = preview(page);
  await frame.scrollIntoViewIfNeeded();
  await expect(frame.locator('[data-slot="website-toolbar"]')).toHaveAccessibleName('Jimmy 的个人网站 (opens in a new tab)');
  await expect.poll(() => frame.getByRole('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(frame.locator('[data-slot="website-viewport"]')).toHaveCSS('height', '400px');
  await capture(page, 'Reusable website preview example');
});

for (const activation of ['image', 'address', 'keyboard'] as const) {
  test(`${activation} opens the website in a separate tab`, async ({ page, context }) => {
    await context.route(destination, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Website destination</title><h1>Personal website</h1>' }));
    await page.goto(lesson);
    const frame = preview(page);
    const opened = page.waitForEvent('popup');
    if (activation === 'keyboard') {
      await frame.locator('[data-slot="website-toolbar"]').focus();
      await page.keyboard.press('Enter');
    } else await frame.locator(activation === 'image' ? 'img' : '[data-slot="website-address"]').click();
    const popup = await opened;
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(destination);
    await expect(popup.getByRole('heading')).toHaveText('Personal website');
    expect(await popup.evaluate(() => window.opener === null)).toBe(true);
    await popup.close();
    await expect(page).toHaveURL(lesson);
    await expect(page.locator('[data-slot="reading-pane"]')).toHaveCount(0);
    await capture(page, `Website opened by ${activation}`);
  });
}

for (const scenario of [{ width: 320, font: '16px' }, { width: 390, font: '16px' }, { width: 390, font: '24px' }]) {
  test(`the browser frame fits ${scenario.width}px with ${scenario.font} text`, async ({ page }) => {
    await page.setViewportSize({ width: scenario.width, height: 844 });
    await page.goto(lesson);
    await page.evaluate(font => { document.documentElement.style.fontSize = font; }, scenario.font);
    const frame = preview(page);
    await frame.scrollIntoViewIfNeeded();
    await expect(frame.locator('[data-slot="website-viewport"]')).toHaveCSS('height', '260px');
    const geometry = await frame.evaluate(element => {
      const image = element.querySelector('img')!.getBoundingClientRect();
      return { frame: element.getBoundingClientRect().toJSON(), image: image.toJSON(), fits: element.scrollWidth <= element.clientWidth + 1 };
    });
    expect(geometry.fits).toBe(true);
    expect(geometry.frame.x).toBeGreaterThanOrEqual(0);
    expect(geometry.frame.right).toBeLessThanOrEqual(scenario.width);
    expect(geometry.image.height / geometry.image.width).toBeCloseTo(1680 / 1920, 2);
    expect((await frame.locator('[data-slot="website-toolbar"]').boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await capture(page, `Website preview ${scenario.width}px ${scenario.font}`);
    await test.info().attach('Website preview geometry', { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
  });
}

test('the preview works with one touch and without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, javaScriptEnabled: false });
  try {
    await context.route(destination, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Personal website</title><h1>Personal website</h1>' }));
    const page = await context.newPage();
    await page.goto(lesson);
    const frame = preview(page);
    await frame.scrollIntoViewIfNeeded();
    await expect.poll(() => frame.getByRole('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await capture(page, 'Website preview without JavaScript');
    const opened = page.waitForEvent('popup');
    await frame.getByRole('img').tap();
    const popup = await opened;
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(destination);
    await expect(page).toHaveURL(lesson);
  } finally { await context.close(); }
});
