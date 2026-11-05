import { test, expect } from '@playwright/test';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published disk catalog.');

for (const [name, width, height] of [
  ['desktop', 1440, 900], ['laptop', 1280, 720], ['phone', 390, 844],
  ['narrow phone', 320, 740], ['landscape', 812, 375], ['short phone', 320, 500],
] as const) {
  test(`the complete hero stays visible while browsing courses on ${name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto('/zh');
    await page.evaluate(() => document.fonts.ready);
    const hero = page.getByRole('banner');
    const initial = (await hero.boundingBox())!;
    expect(initial.height).toBeLessThan(height * .7);
    const disk = page.locator('[data-course-disk="coding-101"]');
    await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }));
    await disk.focus();
    const geometry = await disk.evaluate(element => {
      const box = element.getBoundingClientRect();
      const hero = document.querySelector('[data-slot="home-hero"]')!.getBoundingClientRect();
      const drive = document.querySelector('[data-slot="mac-drive"]')!.getBoundingClientRect();
      return { scrollY, hero: hero.toJSON(), drive: drive.toJSON(), disk: box.toJSON(),
        clickable: element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)) };
    });
    expect(geometry.scrollY).toBeGreaterThan(100);
    expect(geometry.hero.top).toBeCloseTo(0, 1);
    expect(geometry.hero.height).toBeCloseTo(initial.height, 1);
    expect(geometry.drive.bottom).toBeLessThan(height);
    expect(geometry.disk.top).toBeGreaterThanOrEqual(geometry.hero.bottom);
    expect(geometry.clickable).toBe(true);
    await expect(disk).toBeFocused();
    await expect(page.locator('[data-slot="mac-screen"]')).toHaveText('Coding 101');
    await testInfo.attach('Sticky hero and reachable disk', { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
    await testInfo.attach('Scrolled course gallery', { body: await page.screenshot(), contentType: 'image/png' });
  });
}

test('the author action and footer language control remain usable after scrolling', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/zh');
  await page.locator('[data-course-disk="agent-101"]').focus();
  const author = page.getByRole('banner').locator('[data-slot="author-dialog-trigger"]');
  await expect(author).toHaveText('关于作者');
  await author.click();
  await expect(page.locator('[data-author-dialog]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(author).toBeFocused();
  const footer = page.getByRole('contentinfo');
  await footer.locator('summary').click();
  await expect(footer.locator('.language-options')).toBeVisible();
  await testInfo.attach('Footer language choices', { body: await page.screenshot(), contentType: 'image/png' });
  await footer.getByRole('link', { name: 'Français', exact: true }).click();
  await expect(page).toHaveURL('/fr');
  await expect(page.getByRole('banner').locator('[data-slot="author-dialog-trigger"]')).toHaveText('À propos de l’auteur');
  await expect(page.getByRole('banner').locator('.language-picker')).toHaveCount(0);
});
