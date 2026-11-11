import { expect, test } from '@playwright/test';

test.skip(process.env.CONTENT_TEST === '1', 'Uses published course links.');
const source = '/zh/courses/llm-101/what-is-a-token';
const reference = '/zh/courses/llm-101/what-a-language-model-does';

for (const width of [1600, 2054, 2560]) {
  test(`one side pane fills the available reading area at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(source);
    await page.locator(`[data-slot="reading-primary"] .course-prose a[href="${reference}"]`).first().click();
    const pane = page.locator('[data-slot="reading-pane"]');
    await expect(pane).toHaveCount(1);
    const geometry = await page.locator('[data-slot="lesson-reader"]').evaluate(stage => {
      const bounds = stage.getBoundingClientRect();
      const primary = stage.querySelector<HTMLElement>('[data-slot="reading-primary"]')!.getBoundingClientRect();
      const pane = stage.querySelector<HTMLElement>('[data-slot="reading-pane"]')!.getBoundingClientRect();
      return { stage: bounds.toJSON(), primary: primary.toJSON(), pane: pane.toJSON(), unused: bounds.right - pane.right };
    });
    expect(Math.abs(geometry.unused)).toBeLessThanOrEqual(1);
    expect(geometry.primary.width + geometry.pane.width).toBeCloseTo(geometry.stage.width, 0);
    expect(geometry.primary.width).toBeCloseTo(geometry.pane.width, 0);
    await expect(pane.locator(':scope > header')).toHaveCount(0);
    await expect(pane.getByRole('button', { name: '关闭侧栏' })).toBeInViewport();
    await test.info().attach(`Wide reading geometry ${width}`, { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
    await test.info().attach(`Wide side reading ${width}`, { body: await page.screenshot(), contentType: 'image/png' });
  });
}

test('side-pane headings keep canonical links without leaking props or reporting React errors', async ({ page }) => {
  const messages: { type: string; text: string }[] = [];
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) messages.push({ type: message.type(), text: message.text() });
  });
  page.on('pageerror', error => messages.push({ type: 'pageerror', text: error.message }));
  await page.goto(source);
  await page.locator(`[data-slot="reading-primary"] .course-prose a[href="${reference}"]`).first().click();
  const headings = page.locator('[data-slot="reading-pane"] .course-prose h2[id]');
  await expect(headings.first()).toBeVisible();
  const href = await headings.first().locator('a').first().getAttribute('href');
  expect(href).toMatch(/^\/zh\/courses\/llm-101\/what-a-language-model-does#/);
  await headings.first().locator('a').first().click();
  await page.reload();
  await expect(page.locator('[data-slot="reading-pane"] .course-prose h2[id]').first().locator('a').first()).toHaveAttribute('href', href!);
  await expect(page.locator('h1[pageurl], h2[pageurl], h3[pageurl], h4[pageurl], h5[pageurl], h6[pageurl]')).toHaveCount(0);
  const errors = messages.filter(message => message.type === 'pageerror' || /pageurl|does not recognize|hydration|hydrated|invalid dom property/i.test(message.text));
  expect(errors).toEqual([]);
  await test.info().attach('Heading console messages', { body: JSON.stringify({ href, messages }, null, 2), contentType: 'application/json' });
  await test.info().attach('Side heading after refresh', { body: await page.screenshot(), contentType: 'image/png' });
});

test('replacing and closing the side article preserves a wide source lesson position', async ({ page }) => {
  await page.setViewportSize({ width: 2054, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/zh/courses/llm-101/how-ai-chat-works');
  await page.evaluate(() => document.fonts.ready);
  const primary = page.locator('[data-slot="reading-primary"] [data-slot="lesson-region"]');
  const trigger = primary.locator(`.course-prose a[href="${source}"]`);
  await trigger.scrollIntoViewIfNeeded();
  const top = await primary.evaluate(element => element.scrollTop);
  expect(top).toBeGreaterThan(500);
  await trigger.click();
  const panes = page.locator('[data-slot="reading-pane"]');
  await expect(panes).toHaveCount(1);
  await panes.first().locator(`.course-prose a[href="${reference}"]`).first().click();
  await expect(panes).toHaveCount(1);
  await expect(panes.first().locator('article > h2')).toHaveText('大语言模型是如何生成回答的？');
  await expect(panes.last().getByRole('button', { name: '关闭侧栏' })).toBeInViewport();
  await panes.last().getByRole('button', { name: '关闭侧栏' }).click();
  await expect(panes).toHaveCount(0);
  await expect.poll(async () => Math.abs(await primary.evaluate(element => element.scrollTop) - top)).toBeLessThanOrEqual(2);
  await expect(trigger).toBeFocused();
  await test.info().attach('Wide nested reading restores the source', { body: await page.screenshot(), contentType: 'image/png' });
});
