import { test, expect, type Locator } from '@playwright/test';
import { expectAssembled } from './poses';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the public course illustrations.');

const changesWhileStill = (figure: Locator) => figure.evaluate((element) => new Promise<number>((resolve) => {
  let changes = 0;
  const observer = new MutationObserver((records) => { changes += records.length; });
  observer.observe(element, { subtree: true, attributes: true, attributeFilter: ['transform', 'data-progress', 'data-settled'] });
  setTimeout(() => { observer.disconnect(); resolve(changes); }, 700);
}));

test('phone course cards stay assembled and course overviews omit illustrations', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true,
    reducedMotion: 'no-preference', recordVideo: { dir: testInfo.outputPath('video') } });
  const page = await context.newPage();
  try {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/zh');
    const mac = page.locator('[data-slot="home-hero-art"] [data-anatomy="mac"]');
    await expect(mac).toHaveAttribute('data-settled', 'true');
    expect(await changesWhileStill(mac)).toBe(0);
    for (const title of ['从想法到作品', 'LLM 101', 'Coding 101', 'Agent 101']) {
      const card = page.getByRole('link', { name: title, exact: true });
      const figure = card.locator('[data-anatomy]');
      await card.scrollIntoViewIfNeeded();
      await expectAssembled(figure);
      expect(await changesWhileStill(figure)).toBe(0);
      await page.evaluate(() => scrollTo(0, 0));
      await card.scrollIntoViewIfNeeded();
      expect(await changesWhileStill(figure)).toBe(0);
      await testInfo.attach(`${title}-phone-card`, { body: await card.screenshot(), contentType: 'image/png' });
    }
    await testInfo.attach('phone-home', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    for (const title of ['从想法到作品', 'LLM 101', 'Coding 101', 'Agent 101']) {
      await page.getByRole('link', { name: title, exact: true }).tap();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      const figure = page.locator('[data-anatomy]');
      await expect(figure).toBeHidden();
      await expect(figure).toHaveAttribute('data-settled', 'false');
      await expect(page.locator('#course-catalog')).toBeInViewport();
      expect(await changesWhileStill(figure)).toBe(0);
      await testInfo.attach(`${title}-phone-overview`, { body: await page.screenshot(), contentType: 'image/png' });
      await page.goBack();
    }
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    const path = await page.video()?.path();
    if (path) await testInfo.attach('phone-course-illustrations', { path, contentType: 'video/webm' });
  }
});

test('course artwork follows viewport changes without a blank mobile row', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const slug of ['ai-coding', 'llm-101', 'coding-101', 'agent-101']) {
    await page.goto(`/zh/courses/${slug}`);
    const figure = page.locator('[data-anatomy]');
    for (const width of [840, 841, 320]) {
      await page.setViewportSize({ width, height: 900 });
      if (width < 841) {
        await expect(figure).toBeHidden();
        const layout = await page.locator('main > section').first().evaluate(section => {
          const style = getComputedStyle(section);
          const copy = section.firstElementChild!.firstElementChild!;
          return { height: section.getBoundingClientRect().height,
            contentHeight: copy.getBoundingClientRect().height + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) };
        });
        expect(layout.height).toBeCloseTo(layout.contentHeight, 0);
        await expect(page.locator('#course-catalog')).toBeInViewport();
      } else await expect(figure).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach(`${slug}-overview-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    }
  }
});
