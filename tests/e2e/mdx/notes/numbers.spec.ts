import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const lesson = '/zh/courses/llm-101/what-a-language-model-does';
const languages = [
  { lang: 'zh', action: '查看 Jimmy 的批注 1', description: '批注 1' },
  { lang: 'en', action: "Read Jimmy's note 1", description: 'Note 1' },
  { lang: 'ja', action: 'Jimmy のコメント 1を読む', description: 'コメント 1' },
  { lang: 'fr', action: 'Lire la note 1 de Jimmy', description: 'Note 1' },
  { lang: 'es', action: 'Leer la nota 1 de Jimmy', description: 'Nota 1' },
];

async function capture(page: Page, name: string) {
  const geometry = await page.locator('[data-note-trigger-for], [data-slot="note-description"], [data-slot="jimmy-note-popover"]').evaluateAll(elements => elements.filter(element => element.getClientRects().length).map(element => ({
    slot: element.getAttribute('data-slot'), anchor: element.getAttribute('data-note-trigger-for'),
    text: element.textContent, label: element.getAttribute('aria-label'), box: element.getBoundingClientRect().toJSON(),
  })));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await test.info().attach(`${name} layout`, { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
  const file = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path: file, animations: 'disabled' });
  await test.info().attach(name, { path: file, contentType: 'image/png' });
}

test('numbers text and image anchors in reading order and restarts for each document', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(lesson);
  const anchors = page.locator('[data-jimmy-note-anchor]');
  const ids = await anchors.evaluateAll(elements => elements.map(element => element.getAttribute('data-jimmy-note-anchor')!));
  expect(ids).toContain('next-character-credits');
  expect(ids.length).toBeGreaterThanOrEqual(3);
  await expect(page.locator('[data-slot="note-marker"]')).toHaveText(ids.map((_, index) => String(index + 1)));
  for (const [index, id] of ids.entries()) {
    const button = page.locator(`[data-note-trigger-for="${id}"]`);
    await expect(button).toHaveAccessibleName(`查看 Jimmy 的批注 ${index + 1}`);
    await expect(button.locator('svg')).toHaveCount(0);
    await button.click();
    const popover = page.locator('[data-slot="jimmy-note-popover"]');
    await expect(popover.locator('[data-slot="note-number"]')).toHaveCount(0);
    await expect(popover).toHaveAccessibleDescription(`批注 ${index + 1}`);
    await page.keyboard.press('Escape');
    await expect(button).toBeFocused();
  }
  await capture(page, 'numbered-lesson');
  await page.goto('/zh/courses/llm-101/why-model-answers-vary');
  const early = page.locator('[data-note-trigger-for="next-token-selection"]');
  await expect(early).toHaveText('1');
  await early.click();
  await expect(page.locator('[data-slot="jimmy-note-popover"] [data-slot="note-number"]')).toHaveCount(0);
  await expect(page.locator('[data-slot="jimmy-note-popover"]')).toHaveAccessibleDescription('批注 1');
  await page.keyboard.press('Escape');
  await page.goto('/design/components');
  await expect(page.locator('#jimmy-notes [data-slot="note-marker"]')).toHaveText(['1', '2']);
  await expect(page.locator('#math [data-slot="note-marker"]')).toHaveText(['1']);
});

for (const language of languages) {
  test(`localizes numbered controls in ${language.lang}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/design/components?lang=${language.lang}#jimmy-notes`);
    const preview = page.locator('#jimmy-notes');
    const button = preview.locator('[data-note-trigger-for]').first();
    await expect(button).toHaveText('1');
    await expect(button).toHaveAccessibleName(language.action);
    await expect(button).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await button.focus();
    await page.keyboard.press('Enter');
    const popover = page.locator('[data-slot="jimmy-note-popover"]');
    await expect(popover.locator('[data-slot="note-number"]')).toHaveCount(0);
    await expect(popover).toHaveAccessibleDescription(language.description);
    const accessibility = await new AxeBuilder({ page }).include('#jimmy-notes').include('[data-slot="jimmy-note-popover"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await capture(page, `numbered-${language.lang}`);
    await page.keyboard.press('Escape');
    await expect(button).toBeFocused();
  });
}

test('keeps the small raised number reachable through a 44px touch target', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 320, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(lesson);
    const button = page.locator('[data-note-trigger-for="streaming-answer"]');
    await button.scrollIntoViewIfNeeded();
    const geometry = await button.evaluate(element => {
      const box = element.getBoundingClientRect();
      const before = getComputedStyle(element, '::before');
      const marker = element.querySelector('[data-slot="note-marker"]')!.getBoundingClientRect();
      return { x: box.x, y: box.y, markerY: marker.y, width: box.width - parseFloat(before.left) - parseFloat(before.right), height: box.height - parseFloat(before.top) - parseFloat(before.bottom) };
    });
    expect(geometry.width).toBeGreaterThanOrEqual(44);
    expect(geometry.height).toBeGreaterThanOrEqual(44);
    expect(geometry.markerY).toBeLessThan(geometry.y);
    await page.touchscreen.tap(geometry.x - 6, geometry.y + 12);
    await expect(page.locator('[data-slot="jimmy-note-popover"]')).toBeVisible();
    await capture(page, 'numbered-touch');
    await page.keyboard.press('Escape');
    await expect(button).toBeFocused();
  } finally { await context.close(); }
});

test('preserves markers and accessible note descriptions without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/design/components?lang=en');
    const preview = page.locator('#jimmy-notes');
    await expect(preview.locator('[data-slot="note-marker"]')).toHaveText(['1', '2']);
    for (const button of await preview.locator('[data-note-trigger-for]').all()) await expect(button).toBeHidden();
    const notes = preview.getByRole('note', { name: 'Jimmy', exact: true });
    await expect(notes.locator('[data-slot="note-number"]')).toHaveCount(0);
    await expect(notes.nth(1)).toHaveAccessibleDescription('Note 2');
    await expect(notes.first()).toHaveAccessibleDescription('Note 1');
    await notes.first().scrollIntoViewIfNeeded();
    await capture(page, 'numbered-no-js');
  } finally { await context.close(); }
});
