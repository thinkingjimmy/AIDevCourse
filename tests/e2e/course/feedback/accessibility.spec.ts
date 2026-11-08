import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { capture, lesson, menu, openLesson, selectText } from './helpers';

test.skip(process.env.CONTENT_TEST === '1', 'Uses published course reading interactions.');

test('keyboard selection keeps focus until Tab, supports both links, and restores focus on Escape', async ({ page, context }, testInfo) => {
  await context.route('https://github.com/thinkingjimmy/aidevcourse/issues/new**', route => route.fulfill({ contentType: 'text/html', body: '<title>Keyboard issue destination</title>' }));
  await openLesson(page);
  const article = page.locator('article');
  await article.focus();
  // Chromium and WebKit require an existing range unless browser caret browsing is enabled.
  await page.locator('article h1').evaluate(element => window.getSelection()!.setBaseAndExtent(element.firstChild!, 0, element.firstChild!, 2));
  await page.keyboard.down('Shift');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.up('Shift');
  await expect(menu(page)).toBeVisible();
  await expect(article).toBeFocused();
  const selected = await page.evaluate(() => window.getSelection()!.toString());
  expect(selected.length).toBeGreaterThan(0);
  await page.keyboard.press('Tab');
  const question = menu(page).getByRole('link', { name: '提问', exact: true });
  const correction = menu(page).getByRole('link', { name: '纠错', exact: true });
  await expect(question).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(correction).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(question).toBeFocused();
  const results = await new AxeBuilder({ page }).include('[data-slot="selection-feedback"]').analyze();
  expect(results.violations).toEqual([]);
  await capture(page, testInfo, 'keyboard-focus');
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);
  await expect(article).toBeFocused();
  expect(await page.evaluate(() => window.getSelection()!.toString())).toBe(selected);
  await page.keyboard.press('Shift+ArrowRight');
  await expect(menu(page)).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(question).toBeFocused();
  const popup = page.waitForEvent('popup');
  await page.keyboard.press('Enter');
  const destination = await popup;
  await expect(destination).toHaveTitle('Keyboard issue destination');
  await destination.close();
});

test('Tab can leave either end of the action group without trapping focus', async ({ page }, testInfo) => {
  await openLesson(page);
  for (const backward of [true, false]) {
    await selectText(page.locator('article h1'));
    await expect(menu(page)).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(menu(page).locator('a').first()).toBeFocused();
    if (backward) await page.keyboard.press('Shift+Tab');
    else {
      await page.keyboard.press('Tab');
      await expect(menu(page).locator('a').last()).toBeFocused();
      await page.keyboard.press('Tab');
    }
    await expect(menu(page)).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement !== document.body && document.activeElement?.isConnected)).toBe(true);
  }
  await capture(page, testInfo, 'keyboard-exit');
});

test('controls, editable text, empty selections and selections outside the article do not trigger feedback', async ({ page }, testInfo) => {
  await openLesson(page);
  await page.evaluate(() => {
    const section = document.createElement('div');
    section.dataset.feedbackControls = '';
    const input = document.createElement('input');
    input.value = 'Editable input';
    input.setAttribute('aria-label', 'Test input');
    const textarea = document.createElement('textarea');
    textarea.value = 'Editable textarea';
    textarea.setAttribute('aria-label', 'Test textarea');
    const editable = document.createElement('p');
    editable.contentEditable = 'true';
    editable.textContent = 'Editable paragraph';
    const button = document.createElement('button');
    button.textContent = 'Interactive button';
    section.append(input, textarea, editable, button);
    document.querySelector('article > .prose')!.prepend(section);
  });
  for (const selector of ['[data-feedback-controls] button', '[contenteditable="true"]', '[data-slot="sidebar-header"] a']) {
    await selectText(page.locator(selector).first());
    await expect(menu(page)).toHaveCount(0);
  }
  for (const label of ['Test input', 'Test textarea']) {
    await selectText(page.locator('article h1'));
    await expect(menu(page)).toBeVisible();
    await page.getByRole('textbox', { name: label, exact: true }).focus();
    await page.getByRole('textbox', { name: label, exact: true }).selectText();
    await expect(menu(page)).toHaveCount(0);
  }
  await page.evaluate(() => {
    (document.activeElement as HTMLElement).blur();
    const range = document.createRange();
    range.setStartBefore(document.querySelector('[data-slot="sidebar-header"]')!);
    range.setEndAfter(document.querySelector('article h1')!);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  });
  await expect(menu(page)).toHaveCount(0);
  await page.locator('article h1').evaluate(element => window.getSelection()!.setPosition(element.firstChild, 0));
  await expect(menu(page)).toHaveCount(0);
  await capture(page, testInfo, 'excluded-selections');
});

test('touch input keeps the native selection without adding a menu', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await openLesson(page);
    await page.locator('article h1').tap();
    const selected = await selectText(page.locator('article h1'));
    await expect(menu(page)).toHaveCount(0);
    expect(await page.evaluate(() => window.getSelection()!.toString().trim())).toBe(selected);
    await capture(page, testInfo, 'native-touch-selection');
  } finally { await context.close(); }
});

test('article content and navigation remain server-rendered without JavaScript', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(lesson);
    await expect(page.locator('article > h1')).toBeVisible();
    await expect(page.locator('article > .prose')).not.toBeEmpty();
    await expect(menu(page)).toHaveCount(0);
    await capture(page, testInfo, 'server-rendered-article');
  } finally { await context.close(); }
});
