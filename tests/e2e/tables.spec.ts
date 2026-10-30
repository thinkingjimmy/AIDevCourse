import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const examples = [
  { locale: 'zh', name: 'zh-three', headings: ['场景', '说明', '建议'], firstCell: '阅读', lastCell: '保留可核对的材料' },
  { locale: 'en', name: 'en-three', headings: ['Activity', 'Description', 'Next step'], firstCell: 'Read', lastCell: 'Keep evidence others can check' },
  { locale: 'zh', name: 'zh-two', headings: ['检查项', '说明'], firstCell: '目标', lastCell: '留下可重复的步骤' },
  { locale: 'en', name: 'en-two', headings: ['Check', 'Description'], firstCell: 'Goal', lastCell: 'Keep repeatable steps' },
  { locale: 'zh', name: 'zh-five', headings: ['候选', 'a', 'b', '代入公式', '算出的分数'], firstCell: '伞', lastCell: '1' },
];

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }, { name: 'narrow', width: 320, height: 844 }, { name: 'enlarged', width: 390, height: 844 }]) {
  test(`Markdown tables match the theme and remain readable on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const response = await page.goto('/design/components');
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    if (viewport.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
    const evidence = [];
    for (const example of examples) {
      const table = page.locator(`[data-table-example="${example.name}"]`).getByRole('table');
      const container = table.locator('..');
      await expect(table.getByRole('columnheader')).toHaveText(example.headings);
      await expect(table.getByRole('row')).toHaveCount(example.name === 'zh-five' ? 4 : 5);
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
      const geometry = await table.evaluate((element) => {
        const container = element.parentElement!;
        return { name: element.closest('[data-table-example]')?.getAttribute('data-table-example'),
          width: container.clientWidth, scrollWidth: container.scrollWidth,
          columns: [...element.querySelectorAll('th')].map((cell) => ({ width: cell.getBoundingClientRect().width })),
          codeLines: [...element.querySelectorAll('code')].map((code) => {
            const range = document.createRange(); range.selectNodeContents(code); return range.getClientRects().length;
          }) };
      });
      evidence.push(geometry);
      const overflows = geometry.scrollWidth > geometry.width + 1;
      if (viewport.name === 'desktop') expect(overflows).toBe(false);
      if (example.name === 'zh-five') {
        const negativeLines = await table.locator('tbody tr').last().locator('td').nth(1).evaluate((cell) => {
          const range = document.createRange(); range.selectNodeContents(cell); return range.getClientRects().length;
        });
        expect(negativeLines).toBe(1);
        expect(geometry.codeLines).toEqual([1, 1, 1]);
        await expect(table.locator('tbody tr').first().locator('td').last()).toHaveCSS('text-align', 'right');
        expect(geometry.columns[1].width).toBeLessThan(geometry.columns[3].width);
        if (viewport.width < 480) expect(overflows).toBe(true);
      }
      if (overflows) {
        await container.focus();
        await expect(container).toBeFocused();
        // WebKit cancels native scrolling when keydown and keyup share a frame.
        await container.press('ArrowRight', { delay: 150 });
        await expect.poll(() => container.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
        await container.evaluate((element) => { element.scrollLeft = 0; });
      }
      const accessibility = await new AxeBuilder({ page }).include(`[data-table-example="${example.name}"]`).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      if (example.headings.length >= 3) {
        const path = test.info().outputPath(`table-${example.name}-${viewport.name}.png`);
        await container.screenshot({ path, style: 'header { visibility: hidden; }' });
        await test.info().attach(`${example.name} table`, { path, contentType: 'image/png' });
      }
    }
    await test.info().attach('Table sizing', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  });
}

test('Markdown tables remain readable and scrollable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/design/components');
    const table = page.locator('[data-table-example="zh-five"]').getByRole('table');
    const container = table.locator('..');
    await expect(table.getByRole('columnheader')).toHaveText(examples[4].headings);
    await expect(table.getByRole('cell').last()).toHaveText(examples[4].lastCell);
    await container.focus();
    await expect(container).toBeFocused();
    await container.press('ArrowRight', { delay: 150 });
    await expect.poll(() => container.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const path = test.info().outputPath('table-no-js.png');
    await container.screenshot({ path, style: 'header { visibility: hidden; }' });
    await test.info().attach('Table without JavaScript', { path, contentType: 'image/png' });
  } finally { await context.close(); }
});

test('Published candidate table shows all five columns within the article', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 });
  expect((await page.goto('/zh/courses/llm-101/how-models-calculate-token-probabilities'))?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const table = page.locator('article table').filter({ has: page.getByRole('columnheader', { name: '算出的分数', exact: true }) });
  await expect(table.getByRole('columnheader')).toHaveText(examples[4].headings);
  await expect(table.getByRole('cell')).toHaveText(['伞', '2', '1', '2 × 1 + 1', '3', '雨衣', '1', '1', '1 × 1 + 1', '2', '帽子', '-2', '3', '-2 × 1 + 3', '1']);
  const container = table.locator('..');
  const geometry = await container.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { width: element.clientWidth, scrollWidth: element.scrollWidth, right: bounds.right,
      lastColumnRight: element.querySelector('th:last-child')!.getBoundingClientRect().right };
  });
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.lastColumnRight).toBeLessThanOrEqual(geometry.right);
  const path = test.info().outputPath('candidate-table-article.png');
  await container.screenshot({ path, style: 'header { visibility: hidden; }' });
  await test.info().attach('Published candidate table', { path, contentType: 'image/png' });
  await test.info().attach('Published table geometry', { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
});
