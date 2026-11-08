import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

export const lesson = '/zh/courses/llm-101/what-a-language-model-does';
export const menu = (page: Page) => page.locator('[data-slot="selection-feedback"]');

export async function openLesson(page: Page, path = lesson) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-slot="lesson-completion"] button').first()).toBeEnabled();
}

export async function selectText(locator: Locator) {
  await locator.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.getSelection()!.removeAllRanges();
  });
  await locator.scrollIntoViewIfNeeded();
  // Native scrolling and resize observers settle before a user can drag a new range.
  await locator.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return locator.evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    return selection.toString().trim();
  });
}

export async function capture(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
  const evidence = await menu(page).locator('a').evaluateAll(links => links.map(link => {
    const url = new URL((link as HTMLAnchorElement).href);
    return { label: link.textContent, url: url.href, length: url.href.length, parameters: Object.fromEntries(url.searchParams) };
  }));
  await testInfo.attach(`${name}-links`, { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
}

export async function expectWithinReadingPane(page: Page) {
  await expect(menu(page)).toBeVisible();
  const bounds = await menu(page).boundingBox();
  const pane = await page.locator('[data-slot="lesson-region"]').boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(pane!.x + 11);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(pane!.x + pane!.width - 11);
  expect(bounds!.y).toBeGreaterThanOrEqual(pane!.y + 11);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(pane!.y + pane!.height - 11);
}
