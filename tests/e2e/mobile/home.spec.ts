import { test, expect } from '@playwright/test';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published homepage courses.');

for (const width of [320, 375, 390, 430]) {
  test(`phone hero and disk labels fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const locale of ['zh', 'en', 'fr', 'es', 'ja']) {
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      const action = (await page.locator('[data-slot="hero-primary-action"]').boundingBox())!;
      expect(action.height).toBeGreaterThanOrEqual(48);
      const heading = (await page.locator('h1').boundingBox())!;
      const computer = (await page.locator('[data-slot="home-macintosh"]').boundingBox())!;
      expect(heading.x + heading.width).toBeLessThan(computer.x);
      expect(computer.x + computer.width).toBeLessThanOrEqual(width);
      const labels = await page.locator('.disk-label').evaluateAll(elements => elements.map(element => {
        const title = element.querySelector('.disk-title')!.getBoundingClientRect();
        const meta = element.querySelector('.disk-meta')!.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        return { title: element.textContent, fits: title.bottom <= meta.top && meta.bottom <= box.bottom && title.right <= box.right };
      }));
      expect(labels.every(label => label.fits)).toBe(true);
      expect(await page.locator('.disk-grid').first().evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach(`${locale}-home-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      await testInfo.attach(`${locale}-labels-${width}`, { body: JSON.stringify(labels), contentType: 'application/json' });
    }
  });
}

test('phone homepage keeps enlarged text readable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/', '/zh', '/fr', '/es', '/ja']) {
    await page.goto(path);
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
    await expect(page.locator('[data-slot="hero-primary-action"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const fits = await page.locator('.disk-label').evaluateAll(elements => elements.every(element => {
      const title = element.querySelector('.disk-title')!.getBoundingClientRect();
      const meta = element.querySelector('.disk-meta')!.getBoundingClientRect();
      return title.bottom <= meta.top && meta.bottom <= element.getBoundingClientRect().bottom;
    }));
    expect(fits).toBe(true);
    await testInfo.attach(`enlarged-${path === '/' ? 'en' : path.slice(1)}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  }
});
