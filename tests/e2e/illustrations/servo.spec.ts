import { test, expect, type Locator } from '@playwright/test';
import { expectAssembled, expectStill } from './poses';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published Agent 101 course.');

async function readPose(figure: Locator) {
  return figure.evaluate((root) => {
    const frame = root.getBoundingClientRect();
    const parts = [...root.querySelectorAll<SVGGElement>('[data-part]')];
    return {
      transforms: parts.map((part) => part.getAttribute('transform')),
      names: [...new Set(parts.map((part) => part.dataset.piece))].sort(),
      inside: parts.every((part) => {
        const box = part.getBoundingClientRect();
        return box.left >= frame.left - 0.5 && box.top >= frame.top - 0.5
          && box.right <= frame.right + 0.5 && box.bottom <= frame.bottom + 0.5;
      }),
      visible: parts.every((part) => part.getBoundingClientRect().width > 0),
    };
  });
}

for (const width of [1440, 390, 320]) {
  test(`servo stays visible and still with reduced motion at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/zh');
    const card = page.getByRole('region', { name: '中级', exact: true }).getByRole('link', { name: 'Agent 101', exact: true });
    const figure = card.locator('[data-anatomy="servo"]');
    await card.scrollIntoViewIfNeeded();
    await expectAssembled(figure);
    await expect(card.locator('[data-slot="course-card-image"]')).toBeVisible();
    const assembled = await readPose(figure);
    expect(assembled.inside).toBe(true);
    expect(assembled.visible).toBe(true);
    expect(assembled.names).toEqual(['base', 'bearing', 'bearingcap', 'encoder', 'motor', 'output', 'rotor']);
    await card.getByRole('heading').hover();
    await page.waitForTimeout(250);
    expect(await readPose(figure)).toEqual(assembled);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach(`servo-card-${width}`, { body: await card.screenshot(), contentType: 'image/png' });
    if (width === 1440) await testInfo.attach('servo-catalog', { body: await page.locator('#catalog').screenshot(), contentType: 'image/png' });
    await card.focus();
    await card.press('Enter');
    await expect(page).toHaveURL('/zh/courses/agent-101');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Agent 101');
    const hero = page.locator('[data-anatomy="servo"]');
    if (width < 841) await expect(hero).toBeHidden();
    else {
      await expect(hero).toBeVisible();
      await expect(hero).toHaveAttribute('data-settled', 'true');
      await expect.poll(async () => (await readPose(hero)).inside).toBe(true);
    }
    await expect(page.locator('[data-anatomy="chip"]')).toHaveCount(0);
    await testInfo.attach(`servo-hero-${width}`, { body: await page.locator('main > section').first().screenshot(), contentType: 'image/png' });
    expect(errors).toEqual([]);
  });
}

test('servo expands once on hover, stays framed, and assembles on leave', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 },
    reducedMotion: 'no-preference', recordVideo: { dir: testInfo.outputPath('video') } });
  const page = await context.newPage();
  try {
    await page.goto('/zh');
    const card = page.getByRole('link', { name: 'Agent 101', exact: true });
    const figure = card.locator('[data-anatomy="servo"]');
    await card.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expectAssembled(figure);
    const assembled = await readPose(figure);
    await expectStill(figure);
    await testInfo.attach('servo-assembled', { body: await card.screenshot(), contentType: 'image/png' });
    await card.getByRole('heading').hover();
    await expect(figure).toHaveAttribute('data-settled', 'false');
    const samples = await figure.evaluate(async (root) => {
      const frames: { progress: number; inside: boolean }[] = [];
      const started = performance.now();
      while (performance.now() - started < 4700) {
        const frame = root.getBoundingClientRect();
        frames.push({ progress: Number(root.getAttribute('data-progress')), inside:
          [...root.querySelectorAll('[data-part]')].every((part) => {
            const box = part.getBoundingClientRect();
            return box.left >= frame.left - 0.5 && box.top >= frame.top - 0.5
              && box.right <= frame.right + 0.5 && box.bottom <= frame.bottom + 0.5;
          }) });
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      return frames;
    });
    expect(Math.min(...samples.map((sample) => sample.progress))).toBeLessThan(0.5);
    expect(Math.max(...samples.map((sample) => sample.progress))).toBeGreaterThan(0.99);
    expect(samples.every((sample) => sample.inside)).toBe(true);
    expect(samples.every((sample, index) => index === 0 || sample.progress >= samples[index - 1].progress)).toBe(true);
    await expect(figure).toHaveAttribute('data-settled', 'true');
    await expectStill(figure);
    await testInfo.attach('servo-expanded', { body: await card.screenshot(), contentType: 'image/png' });
    await page.mouse.move(0, 0);
    await expectAssembled(figure);
    expect(await readPose(figure)).toEqual(assembled);
    await card.getByRole('heading').hover();
    await expect(figure).toHaveAttribute('data-settled', 'false');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expectAssembled(figure);
    expect(await readPose(figure)).toEqual(assembled);
    await expectStill(figure);
    await testInfo.attach('servo-motion-frames', { body: JSON.stringify(samples), contentType: 'application/json' });
  } finally {
    await context.close();
    const path = await page.video()?.path();
    if (path) await testInfo.attach('servo-hover-motion', { path, contentType: 'video/webm' });
  }
});

test('servo artwork and course navigation remain available without JavaScript', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/zh');
    const card = page.getByRole('link', { name: 'Agent 101', exact: true });
    const figure = card.locator('[data-anatomy="servo"]');
    await expect(figure.locator('svg')).toBeVisible();
    expect((await readPose(figure)).inside).toBe(true);
    await testInfo.attach('servo-card-no-js', { body: await card.screenshot(), contentType: 'image/png' });
    await card.click();
    await expect(page).toHaveURL('/zh/courses/agent-101');
    await expect(page.locator('[data-anatomy="servo"] svg')).toBeHidden();
    await expect(page.locator('#course-catalog')).toBeInViewport();
  } finally { await context.close(); }
});
