import { test, expect } from '@playwright/test';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published homepage courses.');

for (const width of [320, 375, 390, 430]) {
  test(`phone course copy and hardware share space at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const locale of ['zh', 'en']) {
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      const action = page.locator('[data-slot="hero-primary-action"]');
      const actionBox = (await action.boundingBox())!;
      expect(actionBox.width).toBeCloseTo(width - 32, 1);
      expect(actionBox.height).toBeGreaterThanOrEqual(48);
      if (locale === 'en') {
        const lines = await action.getByText('Start learning', { exact: true }).evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return range.getClientRects().length;
        });
        expect(lines).toBe(1);
      }
      const cards = page.locator('[data-slot="course-grid"] > a').filter({ has: page.locator('[data-anatomy]') });
      const layout = [];
      for (const card of await cards.all()) {
        await card.scrollIntoViewIfNeeded();
        await expect(card.locator('[data-anatomy]')).toHaveAttribute('data-settled', 'true');
        const metrics = await card.evaluate((element) => {
          const text = element.querySelector<HTMLElement>('[data-slot="course-card-description"]')!;
          const style = getComputedStyle(text);
          const copy = text.getBoundingClientRect();
          const panel = element.querySelector('[data-slot="course-card-image"]')!.getBoundingClientRect();
          const parts = [...element.querySelectorAll('.iso-fill, .tb-body')]
            .filter((part) => part.getClientRects().length > 0).map((part) => part.getBoundingClientRect());
          const left = Math.min(...parts.map((part) => part.left)), right = Math.max(...parts.map((part) => part.right));
          const top = Math.min(...parts.map((part) => part.top)), bottom = Math.max(...parts.map((part) => part.bottom));
          return { title: element.querySelector('h3')!.textContent,
            readingWidth: copy.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
            fontSize: parseFloat(style.fontSize), complete: text.scrollHeight <= text.clientHeight,
            margins: [left - panel.left, panel.right - right, top - panel.top, panel.bottom - bottom],
            artWidth: (right - left) / panel.width, artHeight: (bottom - top) / panel.height };
        });
        expect(metrics.readingWidth).toBeGreaterThanOrEqual(180);
        expect(metrics.fontSize).toBeGreaterThanOrEqual(15);
        expect(metrics.complete).toBe(true);
        expect(Math.min(...metrics.margins)).toBeGreaterThanOrEqual(-0.5);
        if (metrics.title === 'LLM 101' || metrics.title === '从想法到作品') expect(metrics.artWidth).toBeGreaterThan(0.8);
        else expect(metrics.artHeight).toBeGreaterThan(0.5);
        layout.push(metrics);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach(`${locale}-layout-${width}`, { body: JSON.stringify(layout, null, 2), contentType: 'application/json' });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      await testInfo.attach(`${locale}-home-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
  });
}

test('English phone homepage keeps enlarged text readable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en');
  await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
  const action = page.locator('[data-slot="hero-primary-action"]');
  await expect(action).toBeVisible();
  expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const text = page.locator('[data-slot="course-card-description"]').first();
  expect(await text.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
  await testInfo.attach('english-enlarged-text', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('phone course artwork stays assembled inside its panel', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 740 }, hasTouch: true,
    reducedMotion: 'no-preference', recordVideo: { dir: testInfo.outputPath('video') } });
  const page = await context.newPage();
  try {
    await page.goto('/zh');
    for (const title of ['从想法到作品', 'LLM 101', 'Coding 101', 'Agent 101']) {
      const card = page.getByRole('link', { name: title, exact: true });
      await card.scrollIntoViewIfNeeded();
      const samples = await card.evaluate(async (element) => {
        const samples: boolean[] = [];
        const start = performance.now();
        while (performance.now() - start < 2200) {
          const panel = element.querySelector('[data-slot="course-card-image"]')!.getBoundingClientRect();
          samples.push([...element.querySelectorAll('.iso-fill, .tb-body')].filter((part) => part.getClientRects().length > 0).every((part) => {
            const box = part.getBoundingClientRect();
            return box.left >= panel.left - 0.5 && box.right <= panel.right + 0.5
              && box.top >= panel.top - 0.5 && box.bottom <= panel.bottom + 0.5;
          }));
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
        return samples;
      });
      expect(samples.length).toBeGreaterThan(10);
      expect(samples.every(Boolean)).toBe(true);
      await expect(card.locator('[data-anatomy]')).toHaveAttribute('data-settled', 'false');
      expect(await card.locator('[data-asm]:not([data-asm="cable"]), [data-key], [data-part]')
        .evaluateAll(parts => parts.every(part => !part.getAttribute('transform')))).toBe(true);
      await testInfo.attach(`${title}-assembled`, { body: JSON.stringify(samples), contentType: 'application/json' });
    }
    await page.getByRole('link', { name: 'Agent 101', exact: true }).tap();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Agent 101');
    await expect(page.locator('[data-anatomy]')).toBeHidden();
  } finally {
    await context.close();
    const path = await page.video()?.path();
    if (path) await testInfo.attach('mobile-hardware-framing', { path, contentType: 'video/webm' });
  }
});
