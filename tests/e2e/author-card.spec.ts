import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import type { Locale } from '../../src/lib/i18n/config';
import { localePath } from '../../src/lib/i18n/routing';

const lesson = '/zh/courses/llm-101/why-model-answers-vary';
const messages = (locale: string) => JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
const dictionary = (locale: string) => messages(locale).Author;
test.beforeEach(() => { test.skip(process.env.CONTENT_TEST === '1', 'Uses the published lessons.'); });

async function capture(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

async function openAuthor(page: Page, locale = 'zh') {
  const trigger = page.getByRole('banner').getByRole('button', { name: dictionary(locale).label, exact: true });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: dictionary(locale).label })).toBeVisible();
  return trigger;
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
  const columns = await identity.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
  if (columns === 3) expect(websiteBounds.y + websiteBounds.height / 2).toBeCloseTo(identityBounds.y + identityBounds.height / 2, 0);
  else expect(websiteBounds.width).toBeCloseTo(identityBounds.width, 0);
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
  expect(await actions.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('aria-label'))))
    .toEqual([t.starProjectLabel, t.followXiaohongshu, t.followX, t.followBilibili]);
  await expect(actions.getByRole('link', { name: t.website, exact: true })).toHaveCount(0);
  const actionBounds = await actions.locator('[data-slot="button"]').evaluateAll(buttons => buttons.map(button => {
    const { top, height } = button.getBoundingClientRect();
    return { top, height };
  }));
  expect(actionBounds).toHaveLength(4);
  expect(actionBounds.every(bounds => bounds.height === actionBounds[0].height)).toBe(true);
  expect(new Set(actionBounds.map(bounds => bounds.top)).size).toBeLessThanOrEqual(2);
  for (const link of [x, xiaohongshu, bilibili]) {
    const bounds = (await link.boundingBox())!;
    expect(bounds.width + 0.01).toBeGreaterThanOrEqual(link === xiaohongshu ? 56 : 48);
    expect(bounds.height + 0.01).toBeGreaterThanOrEqual(40);
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
    const frame = element.closest('[data-author-dialog]')!;
    const bounds = frame.getBoundingClientRect();
    const frameStyle = getComputedStyle(frame);
    const radii = [...element.querySelectorAll('[data-slot="button"], [data-slot="author-wechat"], [role="img"]')].map(item => getComputedStyle(item).borderRadius);
    return {
      width: bounds.width,
      radius: frameStyle.borderRadius,
      border: frameStyle.borderColor,
      titleBarBorder: getComputedStyle(frame.querySelector('.author-window-bar')!).borderBottomColor,
      shadow: frameStyle.boxShadow,
      radii,
      overflow: [...element.querySelectorAll('*')].some(item => {
        if (!item.getClientRects().length) return false;
        const box = item.getBoundingClientRect();
        return box.right > bounds.right + 1 || box.left < bounds.left - 1;
      }),
    };
  });
  expect(geometry.radius).toBe('2px');
  expect(geometry.radii.every(radius => radius === '2px')).toBe(true);
  expect(geometry.border).toBe('rgb(49, 86, 75)');
  expect(geometry.titleBarBorder).toBe(geometry.border);
  expect(geometry.shadow).toMatch(/4px 4px 0px 0px/);
  expect(geometry.overflow).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  return { card, geometry };
}

test('author dialog opens from the header and preserves working links', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(lesson);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('article h2').last().scrollIntoViewIfNeeded();
  const toc = page.locator('[data-slot="lesson-toc"]');
  await expect(toc).toBeVisible();
  await expect(page.locator('[data-slot="author-card"]')).toHaveCount(0);
  const footer = page.locator('[data-slot="sidebar-footer"]');
  const trigger = page.getByRole('banner').getByRole('button', { name: dictionary('zh').label, exact: true });
  await expect(trigger).toHaveText('👋');
  const hand = (await trigger.boundingBox())!;
  expect(await footer.getByRole('button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label'))))
    .toEqual([messages('zh').Course.achievementsTitle]);
  await expect(footer.locator('[data-slot="author-dialog-trigger"]')).toHaveCount(0);
  await expect(page.getByRole('banner').getByRole('link', { name: messages('zh').Ui.about, exact: true })).toHaveCount(0);
  await expect(footer.locator('[data-slot="language-menu-trigger"], .language-picker')).toHaveCount(0);
  expect(hand.width).toBeGreaterThanOrEqual(44);
  await capture(page, 'header-author-and-sidebar-achievements');
  await openAuthor(page);
  const { geometry } = await verifyCard(page);
  const dialog = page.getByRole('dialog', { name: dictionary('zh').label });
  await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCSS('backdrop-filter', 'blur(4px)');
  await expect(dialog.locator('.author-window-title')).toBeVisible();
  const closeBounds = (await dialog.locator('.author-window-close').boundingBox())!;
  expect(closeBounds.width).toBeGreaterThanOrEqual(44);
  expect(closeBounds.height).toBeGreaterThanOrEqual(44);
  const accessibility = await new AxeBuilder({ page }).include('[data-author-dialog]').analyze();
  expect(accessibility.violations).toEqual([]);
  await capture(page, 'author-dialog-desktop');
  const screenshot = test.info().outputPath('author-card.png');
  await dialog.screenshot({ path: screenshot });
  await test.info().attach('Author dialog detail', { path: screenshot, contentType: 'image/png' });
  await dialog.getByRole('button', { name: messages('zh').Ui.close, exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.locator('[data-slot="dialog-overlay"]').click({ position: { x: 16, y: 16 } });
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(toc).toBeVisible();
  await toc.locator('a').last().click();
  await expect(page.locator('article h2').last()).toBeInViewport();
  await test.info().attach('Author dialog geometry', { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
});

test('author dialog remains reachable on narrow and short screens', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 844 }, { width: 960, height: 600 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 390, height: 320 }]) {
    await page.setViewportSize(viewport);
    await page.goto(lesson);
    await expect(page.locator('[data-slot="author-card"]')).toHaveCount(0);
    const trigger = await openAuthor(page);
    await verifyCard(page);
    const dialog = page.getByRole('dialog', { name: dictionary('zh').label });
    const close = dialog.getByRole('button', { name: messages('zh').Ui.close, exact: true });
    await expect(close).toBeInViewport();
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    const wechat = dialog.locator('[data-slot="author-wechat"]');
    await wechat.scrollIntoViewIfNeeded();
    await expect(wechat).toBeInViewport({ ratio: .95 });
    await expect(close).toBeInViewport();
    await capture(page, `author-dialog-${viewport.width}-${viewport.height}`);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator('[data-mobile="true"]')).toHaveCount(0);
  }
});

test('author dialog follows the selected language and enlarged text', async ({ page }) => {
  const evidence = [];
  for (const locale of ['en', 'zh', 'ja', 'fr', 'es'] as Locale[]) {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(localePath(locale, '/courses/llm-101/what-a-language-model-does'));
    await openAuthor(page, locale);
    evidence.push({ locale, ...(await verifyCard(page, locale)).geometry });
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
    await openAuthor(page, locale);
    await verifyCard(page, locale);
    await capture(page, `author-dialog-enlarged-${locale}`);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.getByRole('banner').locator('.language-picker summary').click();
    const menu = page.getByRole('banner').locator('.language-options');
    await expect(menu.getByRole('link')).toHaveCount(5);
    await expect(menu.locator('a[aria-current="true"]')).toHaveAttribute('hreflang', locale === 'zh' ? 'zh-Hans' : locale);
    await expect(menu.locator('[data-slot="dropdown-menu-sub-trigger"]')).toHaveCount(0);
    await page.keyboard.press('Escape');
  }
  await test.info().attach('Localized author dialogs', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

for (const width of [1440, 390]) {
  test(`lesson header opens language choices at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/zh/courses/llm-101/what-a-language-model-does');
    const footer = page.locator('[data-slot="sidebar-footer"]');
    await expect(footer.getByRole('button', { name: messages('zh').Ui.more, exact: true })).toHaveCount(0);
    await expect(footer.getByRole('link', { name: messages('zh').Ui.about, exact: true })).toHaveCount(0);
    await expect(footer.locator('[data-slot="language-menu-trigger"], .language-picker')).toHaveCount(0);
    const trigger = page.getByRole('banner').locator('.language-picker summary');
    await trigger.focus();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('banner').locator('.language-options');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link')).toHaveCount(5);
    await expect(menu.locator('[data-slot="dropdown-menu-sub-trigger"]')).toHaveCount(0);
    await expect(menu.getByRole('link', { name: messages('zh').Ui.about, exact: true })).toHaveCount(0);
    await page.keyboard.press('Tab');
    expect(await menu.evaluate(element => element.contains(document.activeElement))).toBe(true);
    await capture(page, `lesson-header-language-menu-${width}`);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await trigger.click();
    await menu.locator('a[hreflang="en"]').click();
    await expect(page).toHaveURL(/\/courses\/llm-101\/what-a-language-model-does$/);
    await expect(page.locator('[data-mobile="true"]')).toHaveCount(0);
  });
}

test('author website and language choices remain available without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(lesson);
      await expect(page.getByRole('banner').getByRole('link', { name: dictionary('zh').website, exact: true })).toHaveAttribute('href', 'https://jimmywong.dev');
      await expect(page.locator('[data-slot="author-dialog-trigger"]')).toBeHidden();
      await expect(page.locator('[data-author-dialog]')).toHaveCount(0);
      await expect(page.locator('[data-slot="author-card"]')).toHaveCount(0);
      const language = page.locator('.language-picker summary').filter({ visible: true });
      await language.click();
      await expect(page.locator('.language-options:visible a')).toHaveCount(5);
      await capture(page, `author-header-no-js-${width}`);
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
  const pane = page.locator('[data-slot="lesson-region"]');
  const active = toc.locator('[aria-current="location"]');
  await expect(active).toHaveCount(1);
  await expect(active).toHaveAttribute('href', (await links.first().getAttribute('href'))!);
  const evidence = [];
  for (const index of [1, 3, 5, 0]) {
    await headings.nth(index).evaluate(heading => heading.scrollIntoView({ block: 'start' }));
    await pane.evaluate(element => element.scrollBy(0, 4));
    await expect(active).toHaveAttribute('href', (await links.nth(index).getAttribute('href'))!);
    expect(new URL(page.url()).hash).toBe('');
    evidence.push({ section: index, url: await active.getAttribute('href'), scrollTop: await pane.evaluate(element => element.scrollTop) });
  }
  await headings.nth(2).evaluate(heading => heading.scrollIntoView({ block: 'start' }));
  await pane.evaluate(element => element.scrollBy(0, -40));
  await expect(active).toHaveAttribute('href', (await links.nth(1).getAttribute('href'))!);
  await links.nth(3).click();
  await expect(active).toHaveAttribute('href', (await links.nth(3).getAttribute('href'))!);
  await expect(headings.nth(3)).toBeInViewport();
  const style = await active.locator('[data-slot="lesson-toc-marker"]').evaluate(element => {
    const css = getComputedStyle(element);
    return { color: css.backgroundColor, height: css.height };
  });
  expect(style.color).toBe('rgb(9, 9, 11)');
  expect(style.height).toBe('3px');
  await capture(page, 'lesson-outline-current-section');
  await page.setViewportSize({ width: 1440, height: 160 });
  await pane.evaluate(element => element.scrollTo(0, element.scrollHeight));
  await expect(active).toHaveAttribute('href', (await links.last().getAttribute('href'))!);
  await expect(active).toBeInViewport();
  expect(await toc.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await pane.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThanOrEqual(1);
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
