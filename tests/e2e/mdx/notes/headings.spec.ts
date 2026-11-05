import { test, expect } from '@playwright/test';
import { readCatalog } from '../../../../src/lib/content/manifest';
import { verifyConnection } from './connections';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published lesson with a note inside a heading.');
const lesson = '/zh/courses/llm-101/what-is-an-agent';
const heading = readCatalog().documents.find((entry) => entry.url === lesson)?.headings[0];

for (const scenario of [
  { name: 'desktop', width: 1536, javaScriptEnabled: true },
  { name: 'mobile', width: 390, javaScriptEnabled: true },
  { name: 'native', width: 1440, javaScriptEnabled: false },
]) {
  test(`heading notes render without leaking interactive controls into the outline on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 960 }, javaScriptEnabled: scenario.javaScriptEnabled, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      expect((await page.goto(lesson))?.status()).toBe(200);
      const title = page.locator(`article h2[id="${heading!.id}"]`);
      await expect(title).toContainText(heading!.title);
      await expect(title.locator('a [data-note-trigger-for]')).toHaveCount(0);
      const outline = page.locator('[data-slot="lesson-toc"]');
      await expect(outline.locator('[data-note-trigger-for], button')).toHaveCount(0);
      if (scenario.width >= 961) {
        const entry = outline.getByRole('link', { name: heading!.title, exact: true });
        await expect(entry).toHaveAttribute('href', `#${heading!.id}`);
        await entry.click();
        await expect(title).toBeInViewport();
      }
      if (scenario.javaScriptEnabled) {
        const trigger = title.locator('[data-note-trigger-for="001"]');
        if (scenario.width < 961) {
          await expect(trigger).toHaveAccessibleName('查看 Jimmy 的批注 1');
          await trigger.scrollIntoViewIfNeeded();
          const url = page.url();
          const pane = page.locator('[data-slot="lesson-region"]');
          const scroll = await pane.evaluate(element => element.scrollTop);
          await trigger.click();
          const popover = page.locator('[data-slot="jimmy-note-popover"]');
          await expect(popover).toContainText('Agent 101');
          await expect(page).toHaveURL(url);
          expect(await pane.evaluate(element => element.scrollTop)).toBe(scroll);
          await page.keyboard.press('Escape');
          await expect(popover).toHaveCount(0);
          await expect(trigger).toBeFocused();
          await trigger.press('Enter');
          await expect(popover).toBeVisible();
        } else {
          await expect(trigger).toBeHidden();
          const card = page.locator('[data-jimmy-note-card="001"]');
          await expect(card).toBeVisible();
          await verifyConnection(card);
        }
      } else {
        await expect(page.locator('[data-slot="note-body"]').filter({ hasText: 'Agent 101' })).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      expect(errors).toEqual([]);
      await testInfo.attach(`heading-note-${scenario.name}`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    } finally { await context.close(); }
  });
}
