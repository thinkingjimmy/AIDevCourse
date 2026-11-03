import { test, expect, type Locator } from '@playwright/test';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published Coding 101 course.');

const courseUrl = '/zh/courses/coding-101';
const labelOpacity = (labels: Locator) => labels.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).opacity));

test('rocket hero labels hide during assembly and return after opening', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'no-preference',
    recordVideo: { dir: testInfo.outputPath('video') },
  });
  const page = await context.newPage();
  try {
    await page.goto(courseUrl);
    await page.mouse.move(0, 0);
    const rocket = page.locator('[data-anatomy="rocket"]');
    const labels = rocket.locator('.co');
    await expect(rocket).toHaveAttribute('data-callouts', 'true');
    await expect(labels).toHaveCount(4);
    await expect(rocket).toHaveAttribute('data-settled', 'true');
    await expect.poll(() => labelOpacity(labels), { intervals: [50] }).toEqual(['1', '1', '1', '1']);
    await testInfo.attach('rocket-hero-open', { body: await page.locator('main > section').first().screenshot(), contentType: 'image/png' });

    await rocket.hover();
    await expect(rocket).toHaveAttribute('data-settled', 'false');
    await expect.poll(() => labelOpacity(labels), { intervals: [50] }).toEqual(['0', '0', '0', '0']);
    await expect.poll(() => rocket.locator('[data-asm="gimbal"]').getAttribute('transform'), { intervals: [50] }).toBeNull();
    await testInfo.attach('rocket-hero-assembled', { body: await rocket.screenshot(), contentType: 'image/png' });
    await expect(rocket).toHaveAttribute('data-settled', 'true');
    await expect.poll(() => labelOpacity(labels), { intervals: [50] }).toEqual(['1', '1', '1', '1']);
    expect(await rocket.evaluate((element) => element.matches(':hover'))).toBe(true);

    await page.mouse.move(0, 0);
    await expect(rocket).toHaveAttribute('data-settled', 'true');
    await expect.poll(() => labelOpacity(labels), { intervals: [50] }).toEqual(['1', '1', '1', '1']);
    await rocket.hover();
    await expect.poll(() => labelOpacity(labels), { intervals: [50] }).toEqual(['0', '0', '0', '0']);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(rocket).toHaveAttribute('data-settled', 'true');
    await expect.poll(() => labelOpacity(labels), { intervals: [50] }).toEqual(['1', '1', '1', '1']);
    await testInfo.attach('rocket-hero-reduced-motion', { body: await rocket.screenshot(), contentType: 'image/png' });
  } finally {
    await context.close();
    const path = await page.video()?.path();
    if (path) await testInfo.attach('rocket-hero-callout-motion', { path, contentType: 'video/webm' });
  }
});

for (const width of [1440, 390, 320]) {
  test(`rocket labels stay readable and confined to the course hero at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/zh');
    const card = page.getByRole('link', { name: 'Coding 101', exact: true });
    await expect(card.locator('[data-anatomy="rocket"]')).toHaveAttribute('data-callouts', 'false');
    await expect(card.locator('.co')).toHaveCount(0);
    await card.click();
    await expect(page).toHaveURL(courseUrl);
    const rocket = page.locator('[data-anatomy="rocket"]');
    const labels = rocket.locator('.co');
    await expect(rocket).toHaveAttribute('data-settled', 'true');
    await expect(labels).toHaveCount(4);
    await expect(rocket.locator('.co-title')).toHaveText(['Nozzle', 'Gimbal', 'Chamber', 'Turbopump']);
    await expect(rocket.locator('.co-sub')).toHaveText(['APIs & output', 'direction & intent', 'code & logic', 'JSON & data']);
    await expect(rocket.locator('.co-line')).toHaveCount(4);
    await expect(rocket.locator('.co-dot')).toHaveCount(4);
    await expect.poll(() => labelOpacity(labels)).toEqual(['1', '1', '1', '1']);
    const layout = await rocket.evaluate((root) => {
      const frame = root.getBoundingClientRect();
      const artRight = Math.max(...[...root.querySelectorAll('.iso-fill, .tb-body')].map((element) => element.getBoundingClientRect().right));
      return [...root.querySelectorAll('.co')].map((label) => {
        const box = label.getBoundingClientRect();
        const text = label.querySelector('.co-title')!.getBoundingClientRect();
        return {
          name: label.closest('[data-asm]')!.getAttribute('data-asm'),
          margins: [box.left - frame.left, box.top - frame.top, frame.right - box.right, frame.bottom - box.bottom],
          textClearance: text.left - artRight,
        };
      });
    });
    expect(layout.map((label) => label.name)).toEqual(['nozzle', 'gimbal', 'chamber', 'ftp']);
    for (const label of layout) {
      expect(Math.min(...label.margins)).toBeGreaterThanOrEqual(0);
      expect(label.textClearance).toBeGreaterThan(0);
    }
    await rocket.hover();
    await expect(rocket).toHaveAttribute('data-settled', 'true');
    expect(await labelOpacity(labels)).toEqual(['1', '1', '1', '1']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach(`rocket-callouts-layout-${width}`, { body: JSON.stringify(layout, null, 2), contentType: 'application/json' });
    await testInfo.attach(`rocket-callouts-${width}`, { body: await page.locator('main > section').first().screenshot(), contentType: 'image/png' });
  });
}
