import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { locales, htmlLanguages } from '../../../src/lib/i18n/config';
import { localePath } from '../../../src/lib/i18n/routing';

async function expectFullSurface(page: Page) {
  const geometry = await page.locator('[data-slot="missing-page"]').evaluate(element => {
    const frame = element.closest('[data-slot="site-window"]')!;
    const outer = frame.getBoundingClientRect();
    const surface = element.getBoundingClientRect();
    const footer = frame.querySelector('footer > div')!.getBoundingClientRect();
    const style = getComputedStyle(frame);
    return {
      frame: { x: outer.x, y: outer.y, width: outer.width, height: outer.height },
      surface: { x: surface.x, width: surface.width, background: getComputedStyle(element).backgroundImage },
      innerLeft: outer.x + parseFloat(style.borderLeftWidth),
      innerRight: outer.right - parseFloat(style.borderRightWidth),
      right: surface.right,
      footerRight: footer.right,
      guide: getComputedStyle(frame, '::before').content,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(geometry.surface.x).toBeCloseTo(geometry.innerLeft, 0);
  expect(geometry.right).toBeCloseTo(geometry.innerRight, 0);
  expect(geometry.footerRight).toBeLessThanOrEqual(geometry.innerRight + 1);
  expect(geometry.surface.background).toContain('radial-gradient');
  expect(geometry.guide).toBe('none');
  expect(geometry.overflow).toBe(false);
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
  return geometry;
}

async function failDictionary(page: Page) {
  await expect.poll(() => page.locator('main').evaluate(element => Object.keys(element).some(key => key.startsWith('__reactFiber')))).toBe(true);
  const injected = await page.locator('main').evaluate(element => {
    type Fiber = { return?: Fiber; memoizedProps?: { errorComponent?: unknown }; stateNode?: { setState(state: { error: Error }): void } };
    const key = Object.keys(element).find(name => name.startsWith('__reactFiber'))!;
    for (let fiber: Fiber | undefined = (element as unknown as Record<string, Fiber>)[key]; fiber; fiber = fiber.return) {
      if (fiber.memoizedProps?.errorComponent && fiber.stateNode?.setState) {
        fiber.stateNode.setState({ error: new Error('Controlled dictionary recovery check') });
        return true;
      }
    }
    return false;
  });
  expect(injected).toBe(true);
  await expect(page.locator('[data-slot="missing-page"]')).toBeVisible();
}

for (const viewport of [{ width: 1920, height: 1120 }, { width: 390, height: 844 }]) {
  test(`404 desktop surface fills the frame at ${viewport.width}px in every language`, async ({ page }, testInfo) => {
    test.setTimeout(60000);
    await page.setViewportSize(viewport);
    const evidence = [];
    for (const locale of locales) {
      const messages = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
      const response = await page.goto(localePath(locale, '/vocabulary/unpublished'));
      expect(response?.status()).toBe(404);
      expect(response?.headers()['x-robots-tag']).toContain('noindex');
      await expect(page.locator('html')).toHaveAttribute('lang', htmlLanguages[locale]);
      await expect(page.locator('h1')).toHaveText(messages.Ui.notFoundTitle);
      await expect.poll(() => page.locator('main').evaluate(element => Object.keys(element).some(key => key.startsWith('__reactFiber')))).toBe(true);
      evidence.push({ locale, geometry: await expectFullSurface(page) });
      if (locale === 'zh') await testInfo.attach(`404-chinese-${viewport.width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await testInfo.attach(`404-surface-${viewport.width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    await testInfo.attach('Localized surface geometry', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  });

  test(`dictionary recovery removes stale page chrome at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    expect((await page.goto('/zh/vocabulary/typography'))?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('文字排版');
    await expect(page.locator('.site-header .mac-window-heading')).toBeVisible();
    expect(errors).toEqual([]);
    await failDictionary(page);
    await expect(page.locator('.site-header .mac-window-heading')).toBeHidden();
    await expectFullSurface(page);
    await testInfo.attach(`dictionary-recovery-${viewport.width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    const home = page.getByRole('link', { name: '返回首页', exact: true });
    await home.focus();
    await home.press('Enter');
    await expect(page).toHaveURL('/zh');
    await expect(page.locator('.home-gallery')).toBeVisible();
  });
}

test('dictionary recovery keeps every link reachable with enlarged text on a short phone', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/zh/vocabulary/typography');
  await failDictionary(page);
  await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
  await expectFullSurface(page);
  for (const link of await page.locator('main a').all()) {
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toBeInViewport({ ratio: 0.9 });
  }
  await testInfo.attach('Dictionary recovery enlarged text', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('404 full surface and native recovery work without JavaScript', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 1440, height: 960 } });
  try {
    const page = await context.newPage();
    expect((await page.goto('/zh/unknown-page'))?.status()).toBe(404);
    await expectFullSurface(page);
    await testInfo.attach('404 no JavaScript', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    await page.getByRole('link', { name: '返回首页', exact: true }).click();
    await expect(page).toHaveURL('/zh');
  } finally { await context.close(); }
});
