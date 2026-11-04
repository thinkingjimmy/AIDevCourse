import { test, expect, type Locator } from '@playwright/test';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published Agent 101 course.');

const opacity = (labels: Locator) => labels.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).opacity));

for (const width of [1440, 390, 320]) {
  test(`servo hero callouts follow the responsive layout at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/zh');
    const card = page.getByRole('link', { name: 'Agent 101', exact: true });
    await expect(card.locator('[data-anatomy="servo"]')).toHaveAttribute('data-callouts', 'false');
    await expect(card.locator('.co')).toHaveCount(0);
    await card.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Agent 101');
    const hero = page.locator('[data-anatomy="servo"]');
    const labels = hero.locator('.co');
    await expect(hero).toHaveAttribute('data-callouts', 'true');
    if (width < 841) {
      await expect(hero).toBeHidden();
      await expect(page.locator('#course-catalog')).toBeInViewport();
      await testInfo.attach(`servo-mobile-overview-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
      return;
    }
    await expect(hero).toHaveAttribute('data-settled', 'true');
    await expect(labels).toHaveCount(5);
    await expect.poll(() => opacity(labels)).toEqual(['1', '1', '1', '1', '1']);
    expect(await hero.locator('.co-title').allTextContents()).toEqual(expect.arrayContaining(['Output flange', 'Bearing', 'Encoder', 'Motor', 'Mount']));
    expect(await hero.locator('.co-sub').allTextContents()).toEqual(expect.arrayContaining(['tools & actions', 'execution loop', 'feedback & checks', 'reasoning & decisions', 'runtime & permissions']));
    await expect(hero.locator('.co-line')).toHaveCount(5);
    await expect(hero.locator('.co-dot')).toHaveCount(5);
    const layout = await hero.evaluate((root) => {
      const frame = root.getBoundingClientRect();
      const artRight = Math.max(...[...root.querySelectorAll('.iso-fill')].map((element) => element.getBoundingClientRect().right));
      return [...root.querySelectorAll('.co')].map((label) => {
        const box = label.getBoundingClientRect();
        const text = label.querySelector('.co-title')!.getBoundingClientRect();
        const dot = label.querySelector('.co-dot')!.getBoundingClientRect();
        const part = label.closest('[data-part]')!;
        const solid = part.querySelector('.iso-solid')!.getBoundingClientRect();
        return { name: part.getAttribute('data-part'),
          margins: [box.left - frame.left, box.top - frame.top, frame.right - box.right, frame.bottom - box.bottom],
          textClearance: text.left - artRight,
          anchorDistance: Math.abs(dot.x + dot.width / 2 - solid.right),
          top: box.top, bottom: box.bottom };
      }).sort((a, b) => a.top - b.top);
    });
    for (let index = 0; index < layout.length; index++) {
      const label = layout[index];
      expect(Math.min(...label.margins)).toBeGreaterThanOrEqual(0);
      expect(label.textClearance).toBeGreaterThan(0);
      expect(label.anchorDistance).toBeLessThan(1);
      if (index) expect(label.top - layout[index - 1].bottom).toBeGreaterThan(5);
    }
    await hero.hover();
    expect(await opacity(labels)).toEqual(['1', '1', '1', '1', '1']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach(`servo-callouts-layout-${width}`, { body: JSON.stringify(layout, null, 2), contentType: 'application/json' });
    await testInfo.attach(`servo-callouts-${width}`, { body: await page.locator('main > section').first().screenshot(), contentType: 'image/png' });
  });
}

test('servo hero labels follow assembly and return when opened', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 },
    reducedMotion: 'no-preference', recordVideo: { dir: testInfo.outputPath('video') } });
  const page = await context.newPage();
  try {
    await page.goto('/zh/courses/agent-101');
    await page.mouse.move(0, 0);
    const hero = page.locator('[data-anatomy="servo"]');
    const labels = hero.locator('.co');
    // The hover loop has a short fully visible hold after the fade completes.
    const expectOpacity = (value: string) => expect.poll(() => opacity(labels), { intervals: [50] }).toEqual(Array(5).fill(value));
    await expect(hero).toHaveAttribute('data-settled', 'true');
    await expectOpacity('1');
    await hero.hover();
    await expect(hero).toHaveAttribute('data-settled', 'false');
    await expectOpacity('0');
    await expect.poll(async () => Number(await hero.getAttribute('data-progress')), { intervals: [50] }).toBeLessThan(0.001);
    await testInfo.attach('servo-callouts-assembled', { body: await hero.screenshot(), contentType: 'image/png' });
    await expect.poll(() => hero.getAttribute('data-settled'), { intervals: [50] }).toBe('true');
    await expectOpacity('1');
    await page.mouse.move(0, 0);
    await expect(hero).toHaveAttribute('data-settled', 'true');
    await hero.hover();
    await expectOpacity('0');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(hero).toHaveAttribute('data-settled', 'true');
    await expectOpacity('1');
  } finally {
    await context.close();
    const path = await page.video()?.path();
    if (path) await testInfo.attach('servo-hero-callout-motion', { path, contentType: 'video/webm' });
  }
});
