/**
 * [INPUT]: The real MDX component preview, responsive viewports, and a production server.
 * [OUTPUT]: JimmyNote rendering, rich Markdown, accessibility, and no-JS screenshot evidence.
 * [POS]: Component acceptance suite; local screenshots do not require baseline images.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const viewport of [{ name: 'desktop', width: 1280, height: 960 }, { name: 'mobile', width: 390, height: 844 }, { name: 'narrow', width: 320, height: 844 }]) {
  test(`JimmyNote renders authored Markdown on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const response = await page.goto('/design/components');
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    const notes = page.getByRole('note', { name: 'Jimmy', exact: true });
    await expect(notes).toHaveCount(2);
    await expect(notes.first()).toContainText('大企业的影子 AI');
    await expect(notes.nth(1).locator('p')).toHaveCount(2);
    await expect(notes.nth(1).locator('p strong')).toContainText('自己的观察');
    await expect(notes.nth(1).getByRole('link', { name: '写作说明' })).toHaveAttribute('href', '#authoring');
    for (const note of await notes.all()) {
      const style = await note.evaluate((element) => {
        const computed = getComputedStyle(element);
        return { background: computed.backgroundColor, color: computed.color, border: computed.borderTopWidth, shadow: computed.boxShadow };
      });
      expect(style).toEqual({ background: 'rgb(232, 232, 227)', color: 'rgb(43, 43, 34)', border: '0px', shadow: 'none' });
      await expect(note.locator('[data-slot="alert-title"]')).toHaveText('Jimmy');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    const path = test.info().outputPath(`jimmy-note-${viewport.name}.png`);
    await page.screenshot({ path, fullPage: true, animations: 'disabled' });
    await test.info().attach('JimmyNote preview', { path, contentType: 'image/png' });
  });
}

test('JimmyNote and its links work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/design/components');
    const notes = page.getByRole('note', { name: 'Jimmy', exact: true });
    await expect(notes).toHaveCount(2);
    await notes.nth(1).getByRole('link', { name: '写作说明' }).click();
    await expect(page).toHaveURL(/#authoring$/);
    await expect(page.locator('#authoring')).toBeInViewport();
    const path = test.info().outputPath('jimmy-note-no-js.png');
    await page.screenshot({ path, fullPage: true });
    await test.info().attach('JimmyNote without JavaScript', { path, contentType: 'image/png' });
  } finally { await context.close(); }
});
