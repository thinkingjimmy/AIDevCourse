import { test, expect } from '@playwright/test';
import { locales } from '../../../src/lib/i18n/config';
import { localePath } from '../../../src/lib/i18n/routing';
import { readdirSync } from 'node:fs';

for (const scenario of [
  { name: 'desktop', width: 1440, columns: 4, javaScriptEnabled: true },
  { name: 'compact desktop', width: 901, columns: 4, javaScriptEnabled: true },
  { name: 'tablet', width: 900, columns: 3, javaScriptEnabled: true },
  { name: 'phone', width: 390, columns: 2, javaScriptEnabled: true },
  { name: 'narrow phone', width: 320, columns: 2, javaScriptEnabled: true },
  { name: 'without JavaScript', width: 1440, columns: 4, javaScriptEnabled: false },
]) {
  test(`homepage hero contains the brand and author action on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: scenario.javaScriptEnabled,
      viewport: { width: scenario.width, height: 960 }, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const evidence = [];
      const loadedArtwork = new Map<string, boolean>();
      page.on('response', response => {
        if (response.url().includes('/images/home/disks/')) {
          loadedArtwork.set(response.url(), response.ok() || response.status() === 304);
        }
      });
      for (const locale of locales) {
        await page.goto(localePath(locale));
        const header = page.getByRole('banner');
        const logo = header.locator('.site-header-logo');
        const language = page.getByRole('contentinfo').locator('.language-picker summary');
        await expect(header).toHaveCount(1);
        await expect(header).toHaveAttribute('data-slot', 'home-hero');
        await expect(page.locator('[data-slot="site-header"]')).toHaveCount(0);
        await expect(header.locator('.language-picker')).toHaveCount(0);
        if (scenario.javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
        await expect(logo.locator('[data-slot="brand-mark"]')).toBeVisible();
        await expect.poll(() => logo.locator('img').first().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
        const metrics = await header.evaluate(element => {
          const hero = element.getBoundingClientRect();
          const logo = element.querySelector('.site-header-logo')!.getBoundingClientRect();
          const title = element.querySelector('h1')!.getBoundingClientRect();
          return { width: hero.width, viewportWidth: document.documentElement.clientWidth, logoLeft: logo.left, contentLeft: hero.left,
            logoTitleGap: title.top - logo.bottom, overflow: document.documentElement.scrollWidth > innerWidth };
        });
        const padding = scenario.width < 359 ? 32 : scenario.width <= 721 ? 40 : 56;
        expect(metrics.width).toBeCloseTo(Math.min(1024, metrics.viewportWidth) - padding, 1);
        expect(metrics.logoLeft).toBeCloseTo(metrics.contentLeft, 1);
        expect(metrics.logoTitleGap).toBeGreaterThanOrEqual(8);
        expect(metrics.logoTitleGap).toBeLessThanOrEqual(14);
        expect(metrics.overflow).toBe(false);
        const grids = await page.locator('[data-slot="course-grid"]').evaluateAll(elements => elements.map(element => ({
          columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
          bounds: element.getBoundingClientRect().toJSON(),
          cards: [...element.querySelectorAll('.course-disk-link')].map(card => card.getBoundingClientRect().toJSON()),
        })));
        for (const grid of grids) {
          expect(grid.columns).toBe(scenario.columns);
          expect(grid.cards.filter(card => Math.abs(card.top - grid.cards[0].top) < 1)).toHaveLength(Math.min(scenario.columns, grid.cards.length));
          expect(grid.cards[0].left).toBeCloseTo(grid.bounds.left, 1);
          if (grid.cards.length >= scenario.columns) {
            const row = grid.cards.slice(0, scenario.columns);
            expect(row.at(-1)!.right).toBeCloseTo(grid.bounds.right, 1);
            const gap = row[1].left - row[0].right;
            for (let index = 2; index < row.length; index++) {
              expect(row[index].left - row[index - 1].right).toBeCloseTo(gap, 1);
            }
          }
          for (const card of grid.cards) {
            expect(card.left).toBeGreaterThanOrEqual(grid.bounds.left - 1);
            expect(card.right).toBeLessThanOrEqual(grid.bounds.right + 1);
          }
        }
        const logoHeight = (await logo.boundingBox())!.height;
        expect(Number(logoHeight.toFixed(3))).toBeGreaterThanOrEqual(44);
        await expect(header).toHaveCSS('border-bottom-width', '0px');
        await expect(page.getByRole('contentinfo')).toHaveCSS('border-top-width', '0px');
        await expect(page.locator('[data-slot="home-macintosh"]')).toBeVisible();
        await expect(page.locator('[data-slot="mac-drive"]')).toBeVisible();
        const diskArtwork = await page.locator('.course-disk').evaluateAll(disks => disks.map(disk =>
          getComputedStyle(disk).borderImageSource.match(/url\(["']?(.*?)["']?\)/)![1]));
        expect(diskArtwork.length).toBeGreaterThan(0);
        expect(diskArtwork.every(url => loadedArtwork.get(url))).toBe(true);
        await language.press('Enter');
        const menu = page.locator('.language-options');
        await expect(menu).toBeVisible();
        const box = (await menu.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(scenario.width);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThan((await language.boundingBox())!.y);
        await language.press('Enter');
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        evidence.push({ locale, ...metrics, grids });
        if (locale === 'zh') {
          const path = testInfo.outputPath('homepage.png');
          await page.screenshot({ path, fullPage: true });
          await testInfo.attach('Homepage', { path, contentType: 'image/png' });
        }
      }
      await testInfo.attach('Hero and footer layout', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    } finally { await context.close(); }
  });
}

test('disk styles are distinct and stay consistent from the catalog to each course', async ({ page }, testInfo) => {
  test.skip(process.env.CONTENT_TEST === '1', 'Uses the published disk catalog.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/zh');
  const catalog = await page.locator('[data-course-disk]').evaluateAll(links => links.map(link => ({
    href: link.getAttribute('href')!,
    artwork: getComputedStyle(link.querySelector('.course-disk')!).borderImageSource,
  })));
  const allArtwork = await page.locator('.course-disk-link .course-disk').evaluateAll(disks =>
    disks.map(disk => getComputedStyle(disk).borderImageSource));
  expect(new Set(allArtwork).size).toBe(allArtwork.length);
  for (const course of catalog) {
    await page.goto(course.href);
    await expect(page.locator('.course-disk-cover .course-disk')).toHaveCSS('border-image-source', course.artwork);
  }
  await page.goto('/zh');
  expect(await page.locator('[data-course-disk] .course-disk').evaluateAll(disks => disks.map(disk => getComputedStyle(disk).borderImageSource)))
    .toEqual(catalog.map(course => course.artwork));
  await testInfo.attach('Course disk artwork', { body: JSON.stringify(catalog), contentType: 'application/json' });
  await testInfo.attach('Pixel disk catalog', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('the pixel disk collection has continuous side rails and opaque labels', async ({ page }, testInfo) => {
  await page.goto('/zh');
  const assets = readdirSync('public/images/home/disks').filter(file => file.endsWith('.svg'));
  const evidence = await page.evaluate(async files => Promise.all(files.map(async file => {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Cannot load ${file}`));
      image.src = `/images/home/disks/${file}`;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const missingSidePixels: number[][] = [], labelHoles: number[][] = [];
    for (let y = 8; y < canvas.height - 6; y++) for (const x of [0, canvas.width - 1]) {
      if (data[(y * canvas.width + x) * 4 + 3] !== 255) missingSidePixels.push([x, y]);
    }
    for (let y = 38; y < canvas.height - 10; y++) for (let x = 8; x < canvas.width - 8; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] !== 255) labelHoles.push([x, y]);
    }
    return { file, missingSidePixels, labelHoles };
  })), assets);
  for (const asset of evidence) {
    expect(asset.missingSidePixels, `${asset.file} has a broken side rail`).toEqual([]);
    expect(asset.labelHoles, `${asset.file} has holes behind the text`).toEqual([]);
  }
  await testInfo.attach('Rendered SVG outlines and labels', {
    body: JSON.stringify(evidence, null, 2), contentType: 'application/json',
  });
});
