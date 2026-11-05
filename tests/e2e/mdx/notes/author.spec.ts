import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const lesson = '/zh/courses/llm-101/what-a-language-model-does';
const label = '作者与关注方式';
const authorDialog = (page: Page) => page.locator('[data-author-dialog]');
const dictionary = (locale: string) => JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8')).Author;

async function capture(page: Page, name: string) {
  await test.info().attach(name, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
}

async function verifyAuthor(page: Page) {
  const dialog = authorDialog(page);
  await expect(dialog).toBeVisible();
  const links = [
    ['个人网站', 'https://jimmywong.dev'],
    ['在 GitHub 为本项目加 Star', 'https://github.com/thinkingjimmy/aidevcourse'],
    ['关注小红书', 'https://www.xiaohongshu.com/user/profile/6073d38d00000000010068a6'],
    ['关注 X', 'https://x.com/thinkingjimmy'],
    ['关注哔哩哔哩', 'https://space.bilibili.com/1409205119'],
  ];
  for (const [name, href] of links) await expect(dialog.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  await expect(dialog.getByRole('img', { name: '公众号二维码占位，暂不可扫描' })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).include('[data-author-dialog]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
}

test.describe('JimmyNote author entry', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'Uses published notes.');

  test('shows one waving-hand entry and opens the shared author dialog with keyboard focus return', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 1536, height: 960 });
    await page.goto(lesson);
    const note = page.locator('[data-jimmy-note-card="streaming-answer"]');
    await note.scrollIntoViewIfNeeded();
    const header = note.locator('[data-slot="note-signature"]');
    const actions = header.locator('[data-slot="note-author-actions"]');
    const trigger = actions.getByRole('button', { name: label, exact: true });
    await expect(actions.getByRole('button')).toHaveCount(1);
    await expect(actions.getByRole('link')).toHaveCount(0);
    await expect(trigger).toHaveText('👋');
    await expect(trigger).toHaveCSS('width', '44px');
    await expect(trigger).toHaveCSS('height', '44px');
    await expect(header.getByText('Jimmy', { exact: true })).toHaveCSS('color', 'rgb(49, 86, 75)');
    await expect(header.getByText('本文作者', { exact: true })).toBeVisible();
    await trigger.hover();
    await expect(authorDialog(page)).toHaveCount(0);
    await capture(page, 'single-author-entry');
    await trigger.focus();
    await trigger.press('Enter');
    await verifyAuthor(page);
    await capture(page, 'note-author-dialog');
    await page.keyboard.press('Escape');
    await expect(authorDialog(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(note).toBeVisible();
    expect(errors).toEqual([]);
  });

  for (const scenario of [
    { name: 'mobile', width: 390, height: 844, fontSize: 16 },
    { name: 'narrow', width: 320, height: 568, fontSize: 16 },
    { name: 'enlarged', width: 390, height: 844, fontSize: 24 },
    { name: 'short', width: 390, height: 360, fontSize: 16 },
  ]) {
    test(`keeps the floating note open beneath the author dialog on ${scenario.name}`, async ({ page }) => {
      await page.setViewportSize(scenario);
      await page.goto(lesson);
      await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, scenario.fontSize);
      const noteTrigger = page.locator('[data-note-trigger-for="streaming-answer"]');
      await noteTrigger.click();
      const note = page.locator('[data-slot="jimmy-note-popover"]');
      const trigger = note.getByRole('button', { name: label, exact: true });
      const close = note.getByRole('button', { name: '关闭', exact: true });
      await expect(trigger).toHaveText('👋');
      const handHitRight = await trigger.evaluate(element => element.getBoundingClientRect().right - parseFloat(getComputedStyle(element, '::before').right));
      const closeHitLeft = await close.evaluate(element => element.getBoundingClientRect().left + parseFloat(getComputedStyle(element, '::before').left));
      expect(handHitRight).toBeLessThanOrEqual(closeHitLeft);
      expect(await note.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      for (const dismiss of ['escape', 'button', 'backdrop']) {
        await trigger.click();
        await verifyAuthor(page);
        await expect(note).toBeVisible();
        await capture(page, `nested-author-${scenario.name}-${dismiss}`);
        if (dismiss === 'escape') await page.keyboard.press('Escape');
        else if (dismiss === 'button') await authorDialog(page).getByRole('button', { name: '关闭', exact: true }).click();
        else await page.mouse.click(1, 1);
        await expect(authorDialog(page)).toHaveCount(0);
        await expect(note).toBeVisible();
        await expect(trigger).toBeFocused();
      }
      await page.keyboard.press('Escape');
      await expect(note).toHaveCount(0);
      await expect(noteTrigger).toBeFocused();
    });
  }

  test('provides a reachable 44px waving-hand target on touch devices', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      await page.goto(lesson);
      await page.locator('[data-note-trigger-for="streaming-answer"]').tap();
      const trigger = page.locator('[data-slot="jimmy-note-popover"]').getByRole('button', { name: label, exact: true });
      const bounds = (await trigger.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      await trigger.tap();
      await verifyAuthor(page);
      await authorDialog(page).getByRole('button', { name: '关闭', exact: true }).tap();
      await expect(trigger).toBeFocused();
      await capture(page, 'touch-author-entry');
    } finally { await context.close(); }
  });
});

for (const locale of ['zh', 'en', 'ja', 'fr', 'es']) {
  test(`note author entry reuses the localized author dialog in ${locale}`, async ({ page }) => {
    const t = dictionary(locale);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/design/components?lang=${locale}`);
    await page.locator('#jimmy-notes [data-note-trigger-for]').first().click();
    const note = page.locator('[data-slot="jimmy-note-popover"]');
    const trigger = note.getByRole('button', { name: t.label, exact: true });
    await expect(trigger).toHaveText('👋');
    await trigger.click();
    await expect(authorDialog(page).getByRole('heading')).toHaveText(t.label);
    await expect(authorDialog(page).getByRole('link', { name: t.website, exact: true })).toHaveAttribute('href', 'https://jimmywong.dev');
    await page.keyboard.press('Escape');
    await expect(note).toBeVisible();
    await expect(trigger).toBeFocused();
    await capture(page, `localized-author-${locale}`);
  });
}

test('keeps a single native waving-hand website link without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/design/components');
    const note = page.locator('#jimmy-notes').getByRole('note', { name: 'Jimmy', exact: true }).first();
    const actions = note.locator('[data-slot="note-author-actions"]');
    const website = actions.getByRole('link', { name: '个人网站', exact: true });
    await expect(website).toBeVisible();
    await expect(website).toHaveText('👋');
    await expect(website).toHaveAttribute('href', 'https://jimmywong.dev');
    await expect(actions.getByRole('button')).toHaveCount(0);
    await capture(page, 'note-author-no-js');
  } finally { await context.close(); }
});
