import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { verifyConnection } from './connections';

const lesson = '/zh/courses/llm-101/what-a-language-model-does';
const anchorSelector = '[data-jimmy-note-anchor="streaming-answer"]';
const cardSelector = '[data-jimmy-note-card="streaming-answer"]';

async function evidence(page: Page, name: string) {
  const geometry = await page.evaluate(() => {
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      overflow: document.documentElement.scrollWidth > innerWidth,
      anchors: [...document.querySelectorAll('[data-jimmy-note-anchor]')].map(box),
      cards: [...document.querySelectorAll('[data-jimmy-note-card]')].map(box),
      connectors: [...document.querySelectorAll('[data-note-connector]')].map(element => ({ id: element.getAttribute('data-note-connector'), path: element.getAttribute('d') })),
      popovers: [...document.querySelectorAll('[data-slot="jimmy-note-popover"]')].map(box),
    };
  });
  expect(geometry.overflow).toBe(false);
  await test.info().attach(`${name} geometry`, { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

test.describe('JimmyNote in lessons', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'Uses published lessons.');

  test('aligns the card while keeping the left outline available without moving the article', async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 960 });
    await page.goto(lesson);
    await page.evaluate(() => document.fonts.ready);
    const anchor = page.locator(anchorSelector);
    const card = page.locator(cardSelector);
    await expect(anchor).toHaveText('一个字一个字地吐出答案');
    await expect(anchor).toHaveCSS('text-decoration-line', 'none');
    await expect(card).toBeVisible();
    await expect(page.locator('[data-note-trigger-for="streaming-answer"]')).toBeHidden();
    await anchor.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + scrollY - 350));
    await verifyConnection(card);
    expect((await card.boundingBox())!.width).toBeCloseTo(336, 0);
    const article = await page.locator('article').boundingBox();
    const toc = page.locator('[data-slot="lesson-aside"]');
    await expect(toc).toBeVisible();
    await evidence(page, 'jimmy-note-aligned');

    await anchor.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + scrollY - 100));
    await expect(toc).toBeVisible();
    expect(await toc.evaluate(element => (element as HTMLElement).inert)).toBe(false);
    expect((await toc.boundingBox())!.x + (await toc.boundingBox())!.width).toBeLessThanOrEqual(article!.x);
    const overlapping = await page.locator('article').boundingBox();
    expect(overlapping!.x).toBe(article!.x);
    expect(overlapping!.width).toBe(article!.width);
    await evidence(page, 'jimmy-note-left-outline-available');

    await card.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().bottom + scrollY + 40));
    await expect(toc).toBeVisible();
    expect(await toc.evaluate(element => (element as HTMLElement).inert)).toBe(false);
    await evidence(page, 'jimmy-note-left-outline-after-scrolling');
  });

  test('connects the last highlighted line without crossing article text', async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 960 });
    await page.goto('/zh/courses/llm-101/open-models-and-local-deployment');
    await page.evaluate(() => document.fonts.ready);
    const anchor = page.locator('[data-jimmy-note-anchor]').first();
    const id = await anchor.getAttribute('data-jimmy-note-anchor');
    const card = page.locator(`[data-jimmy-note-card="${id}"]`);
    for (const fontSize of [16, 40]) {
      await page.locator('article .course-prose').evaluate((element, size) => { (element as HTMLElement).style.fontSize = `${size}px`; }, fontSize);
      await anchor.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + scrollY - 180));
      const geometry = await verifyConnection(card);
      expect(geometry.length).toBeGreaterThan(16);
      if (fontSize === 40) expect(geometry.fragments).toBeGreaterThan(1);
      await evidence(page, `jimmy-note-connector-${fontSize}px`);
    }
  });

  test('switches with the available container width and sidebar state', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(lesson);
    const scope = page.locator('[data-slot="lesson-reading-group"]');
    await expect(scope).toHaveAttribute('data-note-mode', 'popover');
    await expect(page.locator('[data-note-trigger-for="streaming-answer"]')).toBeVisible();
    await page.getByRole('button', { name: '收起侧栏', exact: true }).click();
    await expect(scope).toHaveAttribute('data-note-mode', 'rail');
    await expect(page.locator(cardSelector)).toBeVisible();
    await page.getByRole('button', { name: '展开侧栏', exact: true }).click();
    await expect(scope).toHaveAttribute('data-note-mode', 'popover');
    await page.locator('[data-note-trigger-for="streaming-answer"]').click();
    await expect(page.getByRole('dialog', { name: 'Jimmy 的批注', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1456, height: 900 });
    await expect(scope).toHaveAttribute('data-note-mode', 'rail');
    await expect(page.getByRole('dialog', { name: 'Jimmy 的批注', exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 1455, height: 900 });
    await expect(scope).toHaveAttribute('data-note-mode', 'popover');
    await evidence(page, 'jimmy-note-container-boundary');
  });

  for (const scenario of [
    { name: 'mobile', width: 390, height: 844, fontSize: 16 },
    { name: 'narrow', width: 320, height: 844, fontSize: 16 },
    { name: 'enlarged', width: 390, height: 844, fontSize: 24 },
    { name: 'short', width: 390, height: 360, fontSize: 16 },
  ]) {
    test(`opens and dismisses a reachable floating note on ${scenario.name}`, async ({ page }) => {
      await page.setViewportSize(scenario);
      await page.goto(lesson);
      await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, scenario.fontSize);
      const button = page.locator('[data-note-trigger-for="streaming-answer"]');
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeEnabled();
      const hit = await button.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const before = getComputedStyle(element, '::before');
        return { width: bounds.width - parseFloat(before.left) - parseFloat(before.right), height: bounds.height - parseFloat(before.top) - parseFloat(before.bottom) };
      });
      expect(hit.width).toBeGreaterThanOrEqual(44);
      expect(hit.height).toBeGreaterThanOrEqual(44);
      await button.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Jimmy 的批注', exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('note', { name: 'Jimmy', exact: true }).locator('[data-slot="note-body"]')).toContainText('在实际使用产品的时候');
      const bounds = (await dialog.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(15);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(scenario.width - 15);
      expect(bounds.y).toBeGreaterThanOrEqual(15);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(scenario.height - 15);
      const accessibility = await new AxeBuilder({ page }).include('[data-slot="jimmy-note-popover"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await evidence(page, `jimmy-note-${scenario.name}`);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(button).toBeFocused();
      await button.click();
      await expect(dialog).toBeVisible();
      await page.locator('article h1').click();
      await expect(dialog).toHaveCount(0);
    });
  }

  test('keeps authored notes and anchors connected in every lesson', async ({ page }) => {
    for (const slug of ['what-a-language-model-does', 'what-is-a-token', 'why-model-answers-vary', 'how-models-calculate-token-probabilities', 'how-language-models-are-trained', 'how-model-thinking-works', 'how-models-see-and-hear', 'open-models-and-local-deployment']) {
      await page.setViewportSize({ width: 1536, height: 960 });
      expect((await page.goto(`/zh/courses/llm-101/${slug}`))?.status()).toBe(200);
      const anchors = page.locator('[data-jimmy-note-anchor]');
      await expect(anchors.first()).toBeVisible();
      const ids = await anchors.evaluateAll(elements => elements.map(element => element.getAttribute('data-jimmy-note-anchor')!));
      for (const id of ids) {
        await expect(page.locator(`[data-jimmy-note-card="${id}"]`)).toBeVisible();
        await verifyConnection(page.locator(`[data-jimmy-note-card="${id}"]`));
      }
      await page.setViewportSize({ width: 390, height: 844 });
      for (const id of ids) {
        const button = page.locator(`[data-note-trigger-for="${id}"]`);
        await button.click();
        await expect(page.getByRole('dialog', { name: 'Jimmy 的批注', exact: true }).getByRole('note', { name: 'Jimmy', exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
      }
    }
  });
});

test('matches border and connector weight on a high-density display', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, deviceScaleFactor: 2, viewport: { width: 1536, height: 960 } });
  try {
    const page = await context.newPage();
    await page.goto(lesson);
    await page.evaluate(() => document.fonts.ready);
    const card = page.locator(cardSelector);
    await card.scrollIntoViewIfNeeded();
    await verifyConnection(card);
    await evidence(page, 'jimmy-note-retina');
  } finally { await context.close(); }
});

test('keeps a long note scrollable and its close control reachable on a short screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 360 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/design/components');
  const button = page.locator('[data-note-trigger-for="shadow-ai"]');
  await button.click();
  const dialog = page.getByRole('dialog', { name: 'Jimmy 的批注', exact: true });
  const note = dialog.getByRole('note', { name: 'Jimmy', exact: true });
  expect(await note.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await note.focus();
  await page.keyboard.press('End');
  await expect.poll(() => note.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeInViewport();
  await evidence(page, 'jimmy-note-long-short-screen');
  await page.keyboard.press('Escape');
  await expect(button).toBeFocused();
});

test('stacks multiple cards in a rail without an outline', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 960 });
  await page.goto('/design/components');
  const preview = page.locator('#jimmy-notes');
  const cards = preview.locator('[data-jimmy-note-card]');
  await expect(cards).toHaveCount(2);
  await expect(cards.last()).toBeVisible();
  await expect.poll(async () => {
    const first = (await cards.first().boundingBox())!;
    return (await cards.last().boundingBox())!.y - first.y - first.height;
  }).toBeGreaterThanOrEqual(15.9);
  await expect(cards.nth(1).locator('strong')).toHaveText('自己的观察');
  await expect(cards.nth(1).getByRole('link', { name: '写作说明' })).toHaveAttribute('href', '#authoring');
  await expect(cards.first().locator('img')).toBeVisible();
  await cards.last().scrollIntoViewIfNeeded();
  for (const card of await cards.all()) await verifyConnection(card);
  await evidence(page, 'jimmy-note-multiple-cards');
});

test('preserves native reading and links without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/design/components');
    const notes = page.locator('#jimmy-notes').getByRole('note', { name: 'Jimmy', exact: true });
    await expect(notes).toHaveCount(2);
    await expect(notes.first()).toContainText('大企业的影子 AI');
    await expect(notes.nth(1).locator('[data-slot="note-body"] > p')).toHaveCount(2);
    await expect(page.locator('#jimmy-notes [data-note-trigger-for]').first()).toBeHidden();
    await notes.nth(1).scrollIntoViewIfNeeded();
    await evidence(page, 'jimmy-note-no-js');
    await notes.nth(1).getByRole('link', { name: '写作说明' }).click();
    await expect(page).toHaveURL(/#authoring$/);
  } finally { await context.close(); }
});
