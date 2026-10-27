/**
 * [INPUT]: MDX table previews, native focusable scroll containers, viewports, and a production server.
 * [OUTPUT]: Themed table, content, keyboard scrolling, accessibility, and no-JS acceptance evidence.
 * [POS]: Scoped table E2E suite; screenshots are local artifacts without baseline images.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const examples = [
  { locale: 'zh', name: 'zh-three', headings: ['场景', '说明', '建议'], firstCell: '阅读', lastCell: '保留可核对的材料' },
  { locale: 'en', name: 'en-three', headings: ['Activity', 'Description', 'Next step'], firstCell: 'Read', lastCell: 'Keep evidence others can check' },
  { locale: 'zh', name: 'zh-two', headings: ['检查项', '说明'], firstCell: '目标', lastCell: '留下可重复的步骤' },
  { locale: 'en', name: 'en-two', headings: ['Check', 'Description'], firstCell: 'Goal', lastCell: 'Keep repeatable steps' },
];

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }, { name: 'narrow', width: 320, height: 844 }]) {
  test(`Markdown tables match the theme and remain readable on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const response = await page.goto('/design/components');
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    for (const example of examples) {
      const table = page.locator(`[data-table-example="${example.name}"]`).getByRole('table');
      const container = table.locator('..');
      await expect(table.getByRole('columnheader')).toHaveText(example.headings);
      await expect(table.getByRole('row')).toHaveCount(5);
      await expect(table.getByRole('cell').first()).toHaveText(example.firstCell);
      await expect(table.getByRole('cell').last()).toHaveText(example.lastCell);
      for (const header of await table.getByRole('columnheader').all()) await expect(header).toHaveAttribute('scope', 'col');
      const styles = await table.evaluate((element) => {
        const wrapper = getComputedStyle(element.parentElement!);
        const header = getComputedStyle(element.querySelector('thead')!);
        const row = getComputedStyle(element.querySelector('tr')!);
        return { background: wrapper.backgroundColor, border: wrapper.borderTopColor, radius: wrapper.borderRadius, header: header.backgroundColor, heading: header.color, divider: row.borderBottomColor };
      });
      expect(styles).toEqual({ background: 'rgb(255, 255, 255)', border: 'rgb(228, 228, 231)', radius: '0px', header: 'rgb(244, 244, 245)', heading: 'rgb(9, 9, 11)', divider: 'rgb(228, 228, 231)' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (example.headings.length === 3) {
        const accessibility = await new AxeBuilder({ page }).include(`[data-table-example="${example.name}"]`).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
        const path = test.info().outputPath(`table-${example.locale}-${viewport.name}.png`);
        await container.screenshot({ path });
        await test.info().attach(`${example.locale} table`, { path, contentType: 'image/png' });
        if (viewport.width < 480) {
          expect(await container.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
          await container.focus();
          await expect(container).toBeFocused();
          // WebKit cancels native scrolling when keydown and keyup share a frame.
          await container.press('ArrowRight', { delay: 150 });
          await expect.poll(() => container.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
        }
      }
    }
  });
}

test('Markdown tables remain readable and scrollable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/design/components');
    const table = page.locator('[data-table-example="zh-three"]').getByRole('table');
    const container = table.locator('..');
    await expect(table.getByRole('columnheader')).toHaveText(examples[0].headings);
    await expect(table.getByRole('cell').last()).toHaveText(examples[0].lastCell);
    await container.focus();
    await expect(container).toBeFocused();
    await container.press('ArrowRight', { delay: 150 });
    await expect.poll(() => container.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const path = test.info().outputPath('table-no-js.png');
    await container.screenshot({ path });
    await test.info().attach('Table without JavaScript', { path, contentType: 'image/png' });
  } finally { await context.close(); }
});
