import { test, expect } from '@playwright/test';
import { capture, expectWithinReadingPane, menu, openLesson, selectText } from './helpers';

test.skip(process.env.CONTENT_TEST === '1', 'Uses published lesson text and reading layout.');

test('mouse selection opens after release and preserves native selection and copy', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openLesson(page);
  const title = page.locator('article h1');
  const positions = await title.evaluate(element => {
    const text = element.firstChild!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 4);
    const box = range.getBoundingClientRect();
    return { x: box.x + 1, end: box.right - 1, y: box.y + box.height / 2 };
  });
  await page.mouse.move(positions.x, positions.y);
  await page.mouse.down();
  await page.mouse.move(positions.end, positions.y, { steps: 8 });
  await expect(menu(page)).toHaveCount(0);
  await page.mouse.up();
  await expect(menu(page)).toBeVisible();
  const selected = await page.evaluate(() => window.getSelection()!.toString());
  expect(selected.length).toBeGreaterThan(0);
  await expect(menu(page).getByRole('link', { name: '提问', exact: true })).toBeVisible();
  await expect(menu(page).getByRole('link', { name: '纠错', exact: true })).toBeVisible();
  for (const link of await menu(page).getByRole('link').all()) {
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(32);
    await expect(link.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  }
  expect((await menu(page).boundingBox())!.height).toBeLessThanOrEqual(40);
  await menu(page).hover();
  expect(await page.evaluate(() => window.getSelection()!.toString())).toBe(selected);
  await page.evaluate(() => document.addEventListener('copy', event => {
    document.body.dataset.copiedSelection = window.getSelection()!.toString();
    document.body.dataset.copyPrevented = String(event.defaultPrevented);
  }, { once: true }));
  await page.keyboard.press('ControlOrMeta+c');
  await expect(page.locator('body')).toHaveAttribute('data-copied-selection', selected);
  await expect(page.locator('body')).toHaveAttribute('data-copy-prevented', 'false');
  await expectWithinReadingPane(page);
  await capture(page, testInfo, 'mouse-selection');
});

test('paragraphs, code, tables and multiline selections retain their quoted text', async ({ page }, testInfo) => {
  const scenarios = [
    { path: '/zh/courses/llm-101/what-a-language-model-does', selector: 'article > .prose > p', name: 'paragraph' },
    { path: '/zh/courses/coding-101/call-ai-with-json', selector: 'article pre code', name: 'code' },
    { path: '/zh/courses/llm-101/how-models-calculate-token-probabilities', selector: 'article tbody tr', name: 'table' },
  ];
  for (const scenario of scenarios) {
    await openLesson(page, scenario.path);
    const selected = await selectText(page.locator(scenario.selector).first());
    await expect(menu(page)).toBeVisible();
    const href = await menu(page).getByRole('link', { name: '纠错', exact: true }).getAttribute('href');
    expect(new URL(href!).searchParams.get('original')).toBe(`> ${selected.replaceAll('\n', '\n> ')}\n\n`);
    await expectWithinReadingPane(page);
    await capture(page, testInfo, scenario.name);
  }
  await openLesson(page);
  const paragraphs = page.locator('article > .prose > p');
  await paragraphs.first().scrollIntoViewIfNeeded();
  const selected = await paragraphs.evaluateAll(elements => {
    const range = document.createRange();
    range.setStartBefore(elements[0]);
    range.setEndAfter(elements[1]);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    return window.getSelection()!.toString().trim();
  });
  await expect(menu(page)).toBeVisible();
  expect(new URL((await menu(page).locator('a').first().getAttribute('href'))!).searchParams.get('question')).toBe(`> ${selected.replaceAll('\n', '\n> ')}\n\n`);
  await capture(page, testInfo, 'multiple-paragraphs');
});

test('dismissal stays closed until selection changes and navigation removes the menu', async ({ page }, testInfo) => {
  await openLesson(page);
  const title = page.locator('article h1');
  for (const reason of ['escape', 'outside', 'scroll', 'resize', 'clear']) {
    await title.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.getSelection()!.removeAllRanges());
    await selectText(title);
    await expect(menu(page)).toBeVisible();
    if (reason === 'escape') await page.keyboard.press('Escape');
    if (reason === 'outside') await page.locator('header').first().click({ position: { x: 200, y: 10 } });
    if (reason === 'scroll') await page.locator('[data-slot="lesson-region"]').evaluate(element => { element.scrollTop += 100; });
    if (reason === 'resize') await page.setViewportSize({ width: 1100, height: 800 });
    if (reason === 'clear') await page.evaluate(() => window.getSelection()!.removeAllRanges());
    await expect(menu(page)).toHaveCount(0);
    await page.evaluate(() => document.dispatchEvent(new Event('selectionchange')));
    await expect(menu(page)).toHaveCount(0);
  }
  await selectText(title);
  await expect(menu(page)).toBeVisible();
  await page.locator('[data-slot="sidebar-header"] a').first().click();
  await expect(page).toHaveURL('/zh/courses/llm-101');
  await expect(menu(page)).toHaveCount(0);
  await selectText(page.locator('h1'));
  await expect(menu(page)).toHaveCount(0);
  await capture(page, testInfo, 'outside-lesson');
});

test('placement flips at the reading edge and fits narrow desktop windows', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openLesson(page);
  await selectText(page.locator('article h1'));
  await expect(menu(page)).toHaveAttribute('data-side', 'bottom');
  await expectWithinReadingPane(page);
  const paragraph = page.locator('article > .prose > p').first();
  await selectText(paragraph);
  await expect(menu(page)).toHaveAttribute('data-side', 'top');
  await capture(page, testInfo, 'placement-top');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
  await selectText(page.locator('article h1'));
  await expect(menu(page)).toBeVisible();
  await expectWithinReadingPane(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, testInfo, 'narrow-desktop');
});
