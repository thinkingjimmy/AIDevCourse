import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import type { Locale } from '../../src/lib/i18n/config';
import { localePath } from '../../src/lib/i18n/routing';

const lesson = '/zh/courses/llm-101/why-model-answers-vary';
const dictionary = (locale: string) => JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8')).Author;
test.beforeEach(() => { test.skip(process.env.CONTENT_TEST === '1', 'Uses the published lessons.'); });

async function capture(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

async function verifyCard(page: Page, locale = 'zh') {
  const t = dictionary(locale);
  const card = page.getByRole('region', { name: t.label });
  await expect(card).toBeVisible();
  const website = card.getByRole('link', { name: t.website, exact: true });
  await expect(website).toBeVisible();
  await expect(website).toHaveAttribute('href', 'https://jimmywong.dev');
  await expect(website).toHaveAttribute('target', '_blank');
  await expect(website).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(website).toHaveAttribute('title', t.website);
  await expect(website).toHaveText(t.website);
  await expect(website.locator('svg')).toBeVisible();
  const websitePadding = await website.evaluate(element => {
    const style = getComputedStyle(element);
    return [parseFloat(style.paddingLeft), parseFloat(style.paddingRight)];
  });
  expect(websitePadding.every(padding => padding >= 12)).toBe(true);
  const identity = card.locator('[data-slot="author-identity"]');
  await expect(identity.getByRole('link', { name: t.website, exact: true })).toBeVisible();
  const identityBounds = (await identity.boundingBox())!;
  const websiteBounds = (await website.boundingBox())!;
  expect(websiteBounds.x + websiteBounds.width).toBeCloseTo(identityBounds.x + identityBounds.width, 0);
  expect(websiteBounds.y + websiteBounds.height / 2).toBeCloseTo(identityBounds.y + identityBounds.height / 2, 0);
  await expect(card.getByRole('link', { name: t.starProjectLabel })).toHaveAttribute('href', 'https://github.com/thinkingjimmy/aidevcourse');
  const x = card.getByRole('link', { name: t.followX, exact: true });
  await expect(x).toHaveAttribute('href', 'https://x.com/thinkingjimmy');
  await expect(x).toHaveAttribute('target', '_blank');
  await expect(x).toHaveAttribute('rel', 'noopener noreferrer');
  const xiaohongshu = card.getByRole('link', { name: t.followXiaohongshu });
  const bilibili = card.getByRole('link', { name: t.followBilibili });
  await expect(xiaohongshu).toHaveAttribute('href', 'https://www.xiaohongshu.com/user/profile/6073d38d00000000010068a6');
  await expect(bilibili).toHaveAttribute('href', 'https://space.bilibili.com/1409205119');
  for (const link of [xiaohongshu, bilibili]) {
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveText('');
  }
  for (const brand of ['github', 'x', 'xiaohongshu', 'bilibili', 'wechat']) {
    expect((await page.request.get(`/images/social/${brand}.svg`)).ok()).toBe(true);
    const icon = card.locator(`[data-slot="author-brand-icon"][data-brand="${brand}"]`);
    await expect(icon).toBeVisible();
    await expect(icon).toHaveCSS('mask-image', new RegExp(`/images/social/${brand}\\.svg`));
  }
  await expect(x).toHaveText('');
  await expect(xiaohongshu).toHaveText('');
  const actions = card.locator('[data-slot="author-actions"]');
  await expect(actions.getByRole('link', { name: t.website, exact: true })).toHaveCount(0);
  const actionBounds = await actions.locator('[data-slot="button"]').evaluateAll(buttons => buttons.map(button => {
    const { top, height } = button.getBoundingClientRect();
    return { top, height };
  }));
  expect(actionBounds).toHaveLength(4);
  expect(actionBounds.every(bounds => bounds.top === actionBounds[0].top && bounds.height === actionBounds[0].height)).toBe(true);
  for (const link of [x, xiaohongshu, bilibili]) {
    const bounds = (await link.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(40);
    expect(bounds.height).toBeGreaterThanOrEqual(40);
    const icon = (await link.locator('[data-slot="author-brand-icon"]').boundingBox())!;
    expect(Math.abs(icon.x + icon.width / 2 - bounds.x - bounds.width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(icon.y + icon.height / 2 - bounds.y - bounds.height / 2)).toBeLessThanOrEqual(1.5);
  }
  const star = card.getByRole('link', { name: t.starProjectLabel });
  const starIcon = (await star.locator('[data-slot="author-brand-icon"]').boundingBox())!;
  const starText = (await star.locator('span').last().boundingBox())!;
  expect(Math.abs(starIcon.y + starIcon.height / 2 - starText.y - starText.height / 2)).toBeLessThanOrEqual(1.5);
  await expect(card.getByRole('img', { name: t.qrPlaceholderLabel })).toBeVisible();
  const image = card.locator('img');
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  const geometry = await card.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const frame = element.querySelector('[data-slot="card"]')!;
    const frameStyle = getComputedStyle(frame);
    const radii = [...element.querySelectorAll('[data-slot="button"], [data-slot="author-wechat"], [role="img"]')].map(item => getComputedStyle(item).borderRadius);
    return {
      width: bounds.width,
      radius: frameStyle.borderRadius,
      baseRadius: getComputedStyle(document.documentElement).getPropertyValue('--radius').trim(),
      shadow: frameStyle.boxShadow,
      radii,
      overflow: [...element.querySelectorAll('*')].some(item => {
        if (!item.getClientRects().length) return false;
        const box = item.getBoundingClientRect();
        return box.right > bounds.right + 1 || box.left < bounds.left - 1;
      }),
    };
  });
  expect(geometry.radius).toBe(geometry.baseRadius);
  expect(geometry.radii.every(radius => radius === geometry.baseRadius)).toBe(true);
  expect(geometry.shadow).toMatch(/4px 4px 0px 0px/);
  expect(geometry.overflow).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  return { card, geometry };
}

test('wide lesson outline preserves complete titles and working author links', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(lesson);
  await page.evaluate(() => document.fonts.ready);
  const toc = page.locator('[data-slot="lesson-toc"]');
  const aside = page.locator('[data-slot="lesson-aside"]');
  await expect(toc).toBeVisible();
  const titles = await toc.locator('a').evaluateAll(links => links.map(link => {
    const style = getComputedStyle(link);
    return { title: link.textContent, lines: Math.round((link.getBoundingClientRect().height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)) / parseFloat(style.lineHeight)) };
  }));
  expect(titles.length).toBe(await page.locator('article h2').count());
  expect(titles.every(item => item.lines === 1)).toBe(true);
  expect((await aside.boundingBox())!.width).toBeCloseTo(336, 0);
  expect((await page.locator('article').boundingBox())!.width).toBeCloseTo(680, 0);
  const { card, geometry } = await verifyCard(page);
  const accessibility = await new AxeBuilder({ page }).include('[data-slot="lesson-aside"]').analyze();
  expect(accessibility.violations).toEqual([]);
  await capture(page, 'wide-outline-and-author-card');
  const cardScreenshot = test.info().outputPath('author-card.png');
  await card.screenshot({ path: cardScreenshot, animations: 'disabled' });
  await test.info().attach('Author card detail', { path: cardScreenshot, contentType: 'image/png' });
  await toc.locator('a').last().click();
  await expect(page.locator('article h2').last()).toBeInViewport();
  await test.info().attach('Wide reading geometry', { body: JSON.stringify({ titles, author: geometry }, null, 2), contentType: 'application/json' });
});

test('author card stays hidden when the right rail is unavailable', async ({ page }) => {
  const evidence = [];
  for (const width of [1280, 1024, 960, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(lesson);
    await expect(page.locator('[data-slot="lesson-toc"]')).toBeHidden();
    await expect(page.locator('[data-slot="author-card"]')).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator('[data-slot="lesson-aside"]')).toBeHidden();
    const geometry = await page.locator('[data-slot="lesson-reading-group"]').evaluate(group => ({
      groupHeight: group.getBoundingClientRect().height,
      articleHeight: group.querySelector('article')!.getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    expect(geometry.groupHeight).toBeCloseTo(geometry.articleHeight, 0);
    expect(geometry.overflow).toBe(false);
    await capture(page, `author-card-hidden-${width}`);
    evidence.push({ viewport: width, ...geometry });
  }
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto(lesson);
  const toggle = page.locator('[data-slot="sidebar-trigger"]');
  await toggle.click();
  await expect(page.locator('[data-slot="lesson-toc"]')).toBeVisible();
  await verifyCard(page);
  await toggle.click();
  await expect(page.locator('[data-slot="author-card"]')).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 960 });
  await verifyCard(page);
  await test.info().attach('Responsive author card visibility', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('author card follows outline availability across languages and enlarged text', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 960 });
  const evidence = [];
  for (const locale of ['en', 'zh', 'ja', 'fr', 'es'] as Locale[]) {
    await page.goto(localePath(locale, '/courses/llm-101/what-a-language-model-does'));
    const hasHeadings = await page.locator('[data-slot="lesson-toc"]').count() > 0;
    if (hasHeadings) evidence.push({ locale, ...(await verifyCard(page, locale)).geometry });
    else await expect(page.locator('[data-slot="author-card"]')).toHaveCount(0);
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('[data-slot="author-card"]')).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await capture(page, `author-card-hidden-enlarged-${locale}`);
    evidence.push({ locale, enlarged: true, cardVisible: false });
    await page.setViewportSize({ width: 1920, height: 960 });
  }
  await test.info().attach('Localized author cards', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('author card respects right-rail visibility without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 600 });
      await page.goto(lesson);
      if (width === 1440) {
        const { card } = await verifyCard(page);
        await card.getByRole('link').last().scrollIntoViewIfNeeded();
        await expect(card.getByRole('link').last()).toBeInViewport();
      } else {
        await expect(page.locator('[data-slot="author-card"]')).toBeHidden();
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      }
      await capture(page, `author-card-no-js-${width}`);
    }
  } finally { await context.close(); }
});

test('lesson outline follows reading without changing the URL or page position', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(lesson);
  await page.evaluate(() => document.fonts.ready);
  const toc = page.locator('[data-slot="lesson-toc"]');
  const links = toc.locator('a');
  const headings = page.locator('article h2');
  const active = toc.locator('[aria-current="location"]');
  await expect(active).toHaveCount(1);
  await expect(active).toHaveAttribute('href', (await links.first().getAttribute('href'))!);
  const evidence = [];
  for (const index of [1, 3, 5, 0]) {
    await headings.nth(index).evaluate(heading => {
      const margin = parseFloat(getComputedStyle(heading).scrollMarginTop);
      window.scrollTo({ top: window.scrollY + heading.getBoundingClientRect().top - margin + 4, behavior: 'instant' });
    });
    await expect(active).toHaveAttribute('href', (await links.nth(index).getAttribute('href'))!);
    expect(new URL(page.url()).hash).toBe('');
    evidence.push({ section: index, url: await active.getAttribute('href'), scrollY: await page.evaluate(() => window.scrollY) });
  }
  await headings.nth(2).evaluate(heading => {
    const margin = parseFloat(getComputedStyle(heading).scrollMarginTop);
    window.scrollTo({ top: window.scrollY + heading.getBoundingClientRect().top - margin - 40, behavior: 'instant' });
  });
  await expect(active).toHaveAttribute('href', (await links.nth(1).getAttribute('href'))!);
  await links.nth(3).click();
  await expect(active).toHaveAttribute('href', (await links.nth(3).getAttribute('href'))!);
  await expect(headings.nth(3)).toBeInViewport();
  const style = await active.evaluate(element => {
    const css = getComputedStyle(element);
    return { text: css.color, indicator: css.borderLeftColor, weight: css.fontWeight, indicatorWidth: css.borderLeftWidth };
  });
  expect(style.text).toBe(style.indicator);
  expect(style.weight).toBe('500');
  expect(style.indicatorWidth).toBe('2px');
  await capture(page, 'lesson-outline-current-section');
  await page.setViewportSize({ width: 1440, height: 400 });
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await expect(active).toHaveAttribute('href', (await links.last().getAttribute('href'))!);
  await expect(active).toBeInViewport();
  const pageBottom = await page.evaluate(() => window.scrollY);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(pageBottom);
  await capture(page, 'lesson-outline-short-viewport');
  await test.info().attach('Active section evidence', { body: JSON.stringify({ reading: evidence, style }, null, 2), contentType: 'application/json' });
});

test('lesson outline restores active fragments and native browser history', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(lesson);
  const toc = page.locator('[data-slot="lesson-toc"]');
  const links = toc.locator('a');
  const first = (await links.nth(1).getAttribute('href'))!;
  const second = (await links.nth(4).getAttribute('href'))!;
  await page.goto(`${lesson}${first}`);
  await expect(toc.locator('[aria-current="location"]')).toHaveAttribute('href', first);
  await links.nth(4).click();
  await expect(toc.locator('[aria-current="location"]')).toHaveAttribute('href', second);
  await page.goBack();
  await expect(toc.locator('[aria-current="location"]')).toHaveAttribute('href', first);
  await page.goForward();
  await expect(toc.locator('[aria-current="location"]')).toHaveAttribute('href', second);
  await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
  await page.setViewportSize({ width: 1920, height: 960 });
  await links.nth(2).click();
  await expect(toc.locator('[aria-current="location"]')).toHaveAttribute('href', (await links.nth(2).getAttribute('href'))!);
  await expect(page.locator('article h2').nth(2)).toBeInViewport();
  await capture(page, 'lesson-outline-fragment-and-enlarged-text');
});

test('lesson outline keeps native anchors without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 1440, height: 960 } });
  try {
    const page = await context.newPage();
    await page.goto(lesson);
    const toc = page.locator('[data-slot="lesson-toc"]');
    await expect(toc.locator('[aria-current]')).toHaveCount(0);
    const link = toc.locator('a').nth(2);
    const href = (await link.getAttribute('href'))!;
    await link.click();
    await expect(page.locator('article h2').nth(2)).toBeInViewport();
    expect(decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(href));
    await capture(page, 'lesson-outline-native-anchor-no-js');
  } finally { await context.close(); }
});
