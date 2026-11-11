import { expect, test } from '@playwright/test';

test.skip(process.env.CONTENT_TEST === '1', 'Uses published lesson links.');
const source = '/zh/courses/llm-101/why-model-answers-vary';
const token = '/zh/courses/llm-101/what-is-a-token';
const primary = '[data-slot="reading-primary"]';
const pane = '[data-slot="reading-pane"]';

test('existing references use scoped anchors and retain the original close destination', async ({ page }) => {
  await page.goto(source);
  const trigger = page.locator(`${primary} .course-prose a[href="${token}"]`).first();
  await trigger.click();
  await expect(page.locator(pane)).toHaveCount(1);
  const heading = page.locator(`${pane} .course-prose h2[id]`).first();
  const headingLink = heading.locator('a').first();
  await expect(headingLink).toHaveAttribute('href', /^\/zh\/courses\/llm-101\/what-is-a-token#/);
  await page.locator(`${pane} [data-slot="reading-scroll"]`).evaluate(element => element.scrollTo(0, 600));
  await headingLink.click();
  await expect(heading).toBeInViewport();
  await expect(page.locator(pane)).toHaveCount(1);
  const ids = await page.locator(`${primary} article [id], ${pane} article [id]`).evaluateAll(elements => elements.map(element => element.id));
  expect(new Set(ids).size).toBe(ids.length);
  await trigger.click();
  await expect(page.locator(pane)).toHaveCount(1);
  await page.locator(pane).getByRole('button', { name: '关闭侧栏' }).click();
  await expect(page.locator(pane)).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await test.info().attach('Scoped document anchors', { body: JSON.stringify(ids, null, 2), contentType: 'application/json' });
});

test('slow references show a reachable loading state and can be cancelled', async ({ page }) => {
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route(url => url.searchParams.has('read'), async route => {
    await ready;
    await route.continue().catch(() => {});
  });
  await page.goto(source);
  const trigger = page.locator(`${primary} .course-prose a[href="${token}"]`).first();
  await trigger.click();
  const pending = page.locator('[data-slot="reading-pending"]');
  await expect(pending).toBeVisible();
  await expect(pending.getByRole('status')).toContainText('正在加载课程');
  await expect(pending.getByRole('button', { name: '关闭侧栏' })).toBeInViewport();
  await test.info().attach('Loading side reading', { body: await page.screenshot(), contentType: 'image/png' });
  await page.keyboard.press('Escape');
  release();
  await expect(pending).toHaveCount(0);
  await expect(page.locator(pane)).toHaveCount(0);
  await expect(page).toHaveURL(source);
});

test('closing a pending reference returns focus to its original link', async ({ page }) => {
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route(url => url.searchParams.has('read'), async route => { await ready; await route.continue().catch(() => {}); });
  await page.goto(source);
  const trigger = page.locator(`${primary} .course-prose a[href="${token}"]`).first();
  await trigger.click();
  const pending = page.locator('[data-slot="reading-pending"]');
  await pending.getByRole('button', { name: '关闭侧栏' }).click();
  release();
  await expect(pending).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(source);
  await test.info().attach('Cancelled reference restores focus', { body: await page.screenshot(), contentType: 'image/png' });
});

test('a pending replacement never adds a third article or another header bar', async ({ page }) => {
  const generation = '/zh/courses/llm-101/what-a-language-model-does';
  await page.goto(source);
  const trigger = page.locator(`${primary} .course-prose a[href="${token}"]`).first();
  await trigger.click();
  await expect(page.locator(pane)).toHaveCount(1);
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route(url => url.searchParams.get('read') === generation, async route => { await ready; await route.continue().catch(() => {}); });
  await page.locator(pane).locator(`.course-prose a[href="${generation}"]`).first().click();
  await expect(page.locator('[data-slot="reading-pending"]')).toHaveCount(0);
  await expect(page.locator('[data-slot="lesson-reader"] article')).toHaveCount(2);
  await expect(page.locator(`${pane} > header`)).toHaveCount(0);
  await test.info().attach('Pending replacement keeps two articles', { body: await page.screenshot(), contentType: 'image/png' });
  release();
  await expect(page.locator(`${pane} article > h2`)).toHaveText('大语言模型是如何生成回答的？');
  await expect(page.locator(pane)).toHaveCount(1);
  await page.locator(pane).getByRole('button', { name: '关闭侧栏' }).click();
  await expect(page.locator(pane)).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('multiple reference parameters display only the last valid article', async ({ page }) => {
  const generation = '/zh/courses/llm-101/what-a-language-model-does';
  const query = new URLSearchParams();
  query.append('read', token);
  query.append('read', generation);
  await page.goto(`${source}?${query}`);
  await expect(page.locator(pane)).toHaveCount(1);
  await expect(page.locator(`${pane} article > h2`)).toHaveText('大语言模型是如何生成回答的？');
  await expect(page.locator('[data-slot="lesson-reader"] article')).toHaveCount(2);
  await test.info().attach('Reference URL respects the two-article limit', { body: await page.screenshot(), contentType: 'image/png' });
});

test('direct reference URLs reveal the last pane and ignore unpublished destinations', async ({ page }) => {
  const read = new URLSearchParams();
  read.append('read', token);
  read.append('read', 'https://example.com/private');
  read.append('read', '/zh/courses/missing/private');
  read.append('read', token);
  await page.goto(`${source}?${read}`);
  await expect(page.locator(pane)).toHaveCount(1);
  await expect(page.locator(pane).getByRole('button', { name: '关闭侧栏' })).toBeInViewport();
  await expect(page.locator(`${pane} article > h2`)).toBeFocused();
  await expect(page.locator(`${primary} article h1`)).toHaveCount(1);
  await test.info().attach('Validated reference URL', { body: await page.screenshot(), contentType: 'image/png' });
});

test('a note popover receives Escape before its reading pane', async ({ page }) => {
  await page.goto(`${source}?${new URLSearchParams({ read: token })}`);
  const note = page.locator(pane).getByRole('button', { name: /查看 Jimmy 的批注|阅读 Jimmy 的批注/ }).first();
  const buttons = page.locator(`${pane} [data-note-trigger-for]`);
  const trigger = await note.count() ? note : buttons.first();
  await trigger.click();
  const popover = page.locator('[data-slot="jimmy-note-popover"]');
  await expect(popover).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);
  await expect(page.locator(pane)).toHaveCount(1);
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator(pane)).toHaveCount(0);
  await test.info().attach('Nested dismissal preserves reading', { body: await page.screenshot(), contentType: 'image/png' });
});

test('opening and closing a reference preserves the middle of a long lesson', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 960 });
  await page.goto('/zh/courses/llm-101/how-ai-chat-works');
  await page.evaluate(() => document.fonts.ready);
  const scroller = page.locator(`${primary} [data-slot="lesson-region"]`);
  const trigger = scroller.locator(`.course-prose a[href="${token}"]`);
  await trigger.scrollIntoViewIfNeeded();
  const before = { top: await scroller.evaluate(element => element.scrollTop), link: await trigger.boundingBox() };
  expect(before.top).toBeGreaterThan(500);
  await trigger.click();
  await expect(page.locator(pane)).toHaveCount(1);
  await expect.poll(async () => Math.abs((await trigger.boundingBox())!.y - before.link!.y)).toBeLessThanOrEqual(2);
  const opened = await trigger.boundingBox();
  await page.locator(pane).getByRole('button', { name: '关闭侧栏' }).click();
  await expect(page.locator(pane)).toHaveCount(0);
  await expect.poll(async () => Math.abs(await scroller.evaluate(element => element.scrollTop) - before.top)).toBeLessThanOrEqual(2);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.locator(pane)).toHaveCount(1);
  await page.goBack();
  await expect(page.locator(pane)).toHaveCount(0);
  await expect.poll(async () => Math.abs(await scroller.evaluate(element => element.scrollTop) - before.top)).toBeLessThanOrEqual(2);
  await test.info().attach('Long lesson scroll continuity', { body: JSON.stringify({ before, opened, after: await trigger.boundingBox() }, null, 2), contentType: 'application/json' });
});

test('all course languages open local references and keep their own interface labels', async ({ page }) => {
  const evidence = [];
  for (const [prefix, closeLabel] of [['/zh', '关闭侧栏'], ['', 'Close side reading'], ['/ja', 'サイド表示を閉じる'], ['/fr', 'Fermer la lecture latérale'], ['/es', 'Cerrar la lectura lateral']]) {
    const source = `${prefix}/courses/llm-101/why-model-answers-vary`;
    const target = `${prefix}/courses/llm-101/what-is-a-token`;
    await page.goto(source);
    await page.locator(`${primary} .course-prose a[href="${target}"]`).first().click();
    await expect(page.locator(pane)).toHaveCount(1);
    await expect(page.locator(pane).getByRole('button', { name: closeLabel, exact: true })).toBeInViewport();
    evidence.push({ source, target, closeLabel, title: await page.locator(`${pane} article > h2`).textContent() });
  }
  await test.info().attach('Localized side reading', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});
