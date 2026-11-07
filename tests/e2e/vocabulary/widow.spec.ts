import { test, expect, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { locales } from '../../../src/lib/i18n/config';
import { localePath } from '../../../src/lib/i18n/routing';

test.use({ reducedMotion: 'reduce' });

async function renderedLines(element: Locator) {
  return element.evaluate(element => {
    const lines = new Map<number, { text: string; left: number; right: number }>();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      let offset = 0;
      for (const character of node.textContent ?? '') {
        const range = document.createRange();
        range.setStart(node, offset);
        offset += character.length;
        range.setEnd(node, offset);
        const rect = range.getBoundingClientRect();
        if (!rect.width) continue;
        const key = Math.round(rect.top);
        const line = lines.get(key) ?? { text: '', left: rect.left, right: rect.right };
        line.text += character;
        line.left = Math.min(line.left, rect.left);
        line.right = Math.max(line.right, rect.right);
        lines.set(key, line);
      }
    }
    return [...lines.values()].map(line => ({ text: line.text.trim(), width: line.right - line.left }));
  });
}

for (const width of [1280, 390]) {
  test(`widow balances a full English biography in every language at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    const evidence = [];
    for (const locale of locales) {
      const messages = JSON.parse(readFileSync(`src/messages/vocabulary/${locale}.json`, 'utf8'));
      await page.goto(`${localePath(locale, '/vocabulary/typography')}#widow`);
      const card = page.locator('#widow');
      await expect(card).toBeInViewport();
      await page.evaluate(() => document.fonts.ready);
      const bio = card.locator('.widow-sample');
      await expect(bio).toHaveAttribute('lang', 'en');
      const text = await bio.textContent();
      const before = await renderedLines(bio);
      const bounds = (await bio.boundingBox())!;
      expect(before).toHaveLength(4);
      expect(before.at(-1)!.text).toBe('day.');
      await testInfo.attach(`Widow original ${locale} ${width}px`, { body: await card.screenshot(), contentType: 'image/png' });

      await card.getByRole('tab', { name: messages.apply, exact: true }).click();
      await expect(bio).toHaveCSS('text-wrap-style', 'balance');
      const after = await renderedLines(bio);
      await expect(bio).toHaveText(text!);
      expect(after).toHaveLength(before.length);
      expect(after.at(-1)!.width).toBeGreaterThan(before.at(-1)!.width + 20);
      expect(after.at(-1)!.width).toBeGreaterThanOrEqual(bounds.width / 2);
      expect(after.at(-1)!.text.split(/\s+/).length).toBeGreaterThanOrEqual(3);
      const widths = after.map(line => line.width);
      expect(Math.min(...widths) / Math.max(...widths)).toBeGreaterThanOrEqual(0.75);
      expect(widths.reduce((sum, width) => sum + width, 0) / widths.length / bounds.width).toBeGreaterThanOrEqual(0.7);
      expect((await bio.boundingBox())!.width).toBeCloseTo(bounds.width, 1);
      expect((await bio.boundingBox())!.height).toBeCloseTo(bounds.height, 1);
      expect(await bio.evaluate(element => element.scrollWidth > element.clientWidth + 1)).toBe(false);
      await testInfo.attach(`Widow adjusted ${locale} ${width}px`, { body: await card.screenshot(), contentType: 'image/png' });
      await card.getByRole('tab', { name: messages.original, exact: true }).click();
      expect(await renderedLines(bio)).toEqual(before);
      evidence.push({ locale, before, after });
    }
    await testInfo.attach('Widow line measurements', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  });
}
