import { test, expect, type Page } from '@playwright/test';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published disk catalog.');
const courseUrl = '/zh/courses/llm-101';
const diskSelector = '[data-course-disk="llm-101"]';
type FlightWindow = Window & {
  diskPhases?: string[];
  insertion?: { horizontalError: number; insideSlot: boolean; screen: string; scrollY: number; heroTop: number };
};
async function recordPhases(page: Page) {
  await page.locator('.home-gallery').evaluate(element => {
    const phases: string[] = [];
    const recorded = window as FlightWindow;
    recorded.diskPhases = phases;
    new MutationObserver(() => {
      const phase = (element as HTMLElement).dataset.diskPhase!;
      phases.push(phase);
      if (phase !== 'inserting') return;
      const slot = element.querySelector('[data-slot="mac-drive"]')!.getBoundingClientRect();
      const pocket = element.querySelector('.disk-insertion-pocket')!.getBoundingClientRect();
      recorded.insertion = {
        horizontalError: Math.abs(pocket.left + pocket.width / 2 - slot.left - slot.width / 2),
        insideSlot: pocket.top >= slot.top - .5 && pocket.top <= slot.bottom + .5,
        screen: element.querySelector('.pixel-screen-title')?.textContent ?? '',
        scrollY,
        heroTop: element.querySelector('[data-slot="home-hero"]')!.getBoundingClientRect().top,
      };
    }).observe(element, { attributes: true, attributeFilter: ['data-disk-phase'] });
  });
}
async function phases(page: Page) { return page.evaluate(() => (window as FlightWindow).diskPhases); }

for (const width of [1440, 390]) {
  test(`disk inserts into the Mac before opening the course at ${width}px`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, hasTouch: width < 721,
      reducedMotion: 'no-preference', recordVideo: { dir: testInfo.outputPath('video') } });
    const page = await context.newPage();
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto('/zh'); await recordPhases(page);
      const disk = page.locator(diskSelector);
      if (width < 721) await disk.tap(); else await disk.click();
      await expect(page.locator('.home-gallery')).toHaveAttribute('data-disk-phase', 'lifting');
      await expect(page.locator('.flying-course-disk')).toBeVisible();
      await expect(page).toHaveURL(courseUrl);
      await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
      await expect(page.locator('main h1')).toHaveText('LLM 101');
      expect(await phases(page)).toEqual(expect.arrayContaining(['lifting', 'inserting', 'navigating']));
      const insertion = await page.evaluate(() => (window as FlightWindow).insertion);
      expect(insertion).toMatchObject({ insideSlot: true, screen: 'LLM 101' });
      expect(insertion!.horizontalError).toBeLessThan(1);
      expect(insertion!.heroTop).toBeCloseTo(0, 1);
      await testInfo.attach('Disk alignment', { body: JSON.stringify(insertion), contentType: 'application/json' });
      await page.locator('[data-slot="hero-primary-action"]').click();
      await expect(page.locator('article h1')).toBeVisible();
      await expect(page.getByRole('banner')).toHaveCount(1);
      const home = page.getByRole('banner').locator('.site-header-logo');
      if (width < 721) await home.tap(); else await home.click();
      await expect(page).toHaveURL('/zh');
      await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
      await expect(disk).toBeVisible();
      await expect(page.locator('.home-gallery')).not.toHaveAttribute('inert');
      await expect(disk.locator('.course-disk')).toHaveCSS('opacity', '1');
      expect(errors).toEqual([]);
      await testInfo.attach('Transition phases', { body: JSON.stringify(await phases(page)), contentType: 'application/json' });
      await testInfo.attach('Restored home', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    } finally {
      await context.close();
      const video = await page.video()?.path();
      if (video) await testInfo.attach('Disk to course to reading', { path: video, contentType: 'video/webm' });
    }
  });
}

test('the pixel display previews a focused or hovered course and restores its greeting', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/zh');
  const screen = page.locator('[data-slot="mac-screen"]');
  const greeting = screen.locator('use[href$="#pixel-screen-content"]');
  await expect(greeting).toBeVisible();
  await testInfo.attach('Pixel hero', { body: await page.locator('[data-slot="home-hero"]').screenshot(), contentType: 'image/png' });
  await page.locator(diskSelector).focus();
  await expect(screen).toHaveText('LLM 101');
  await expect(greeting).toHaveCount(0);
  await page.locator('[data-slot="hero-primary-action"]').focus();
  await expect(greeting).toBeVisible();
  await page.locator('[data-course-disk="ai-coding"]').hover();
  await expect(screen).toHaveText('从想法到作品');
  await testInfo.attach('Course preview', { body: await page.locator('[data-slot="home-macintosh"]').screenshot(), contentType: 'image/png' });
});

test('a course opens when the pixel artwork cannot load', async ({ page }) => {
  await page.route('**/images/home/pixel-macintosh.svg', route => route.abort());
  await page.goto('/zh');
  await recordPhases(page);
  await page.locator(diskSelector).click();
  await expect(page).toHaveURL(courseUrl);
  await expect(page.locator('main h1')).toHaveText('LLM 101');
  await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
  expect(await phases(page)).toEqual([]);
  await page.getByRole('banner').locator('.site-header-logo').click();
  await expect(page).toHaveURL('/zh');
  await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
  await expect(page.locator(diskSelector)).toBeVisible();
});

test('Escape cancels insertion and restores the selected disk', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/zh');
  const disk = page.locator(diskSelector);
  await disk.click();
  await expect(page.locator('.home-gallery')).toHaveAttribute('data-disk-phase', 'lifting');
  await page.keyboard.press('Escape');
  await expect(page.locator('.home-gallery')).toHaveAttribute('data-disk-phase', 'idle');
  await expect(page.locator('.home-gallery')).not.toHaveAttribute('inert');
  await expect(disk).toBeFocused();
  await expect(disk.locator('.course-disk')).toHaveCSS('opacity', '1');
  await expect(page.locator('.flying-course-disk,.disk-insertion-pocket,[data-in-drive],[data-course-zoom]')).toHaveCount(0);
  await testInfo.attach('Cancelled insertion', { body: await page.screenshot(), contentType: 'image/png' });
  await disk.click();
  await expect(page).toHaveURL(courseUrl);
});

for (const mode of ['keyboard', 'reduced motion', 'modified click', 'unavailable screen zoom'] as const) {
  test(`${mode} keeps native course and home navigation`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: mode === 'reduced motion' ? 'reduce' : 'no-preference' });
    if (mode === 'unavailable screen zoom') {
      await page.addInitScript(() => Object.defineProperty(document, 'startViewTransition', { value: undefined }));
    }
    await page.goto('/zh'); await recordPhases(page);
    await page.addStyleTag({ content: ':root[data-course-zoom]::view-transition-group(root) { animation-play-state: paused !important; }' });
    const disk = page.locator(diskSelector);
    if (mode === 'modified click') {
      await page.evaluate(() => {
        document.addEventListener('click', event => {
          (window as unknown as { navigationPrevented: boolean }).navigationPrevented = event.defaultPrevented;
        }, { once: true });
      });
      await disk.click({ modifiers: ['Meta'] });
      expect(await page.evaluate(() => (window as unknown as { navigationPrevented: boolean }).navigationPrevented)).toBe(false);
      await expect(page).toHaveURL('/zh');
    } else {
      if (mode === 'keyboard') { await disk.focus(); await disk.press('Enter'); }
      else await disk.click();
      await expect(page).toHaveURL(courseUrl);
      await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
      const home = page.getByRole('banner').locator('.site-header-logo');
      if (mode === 'keyboard') { await home.focus(); await home.press('Enter'); }
      else await home.click();
      await expect(page).toHaveURL('/zh');
    }
    expect(await phases(page)).toEqual([]);
    await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
    await testInfo.attach('Native navigation', { body: await page.screenshot(), contentType: 'image/png' });
  });
}

for (const interruption of ['viewport', 'motion preference'] as const) {
  test(`a changed ${interruption} completes navigation without a stuck overlay`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.goto('/zh');
    await page.locator(diskSelector).click();
    await expect(page.locator('.home-gallery')).toHaveAttribute('data-disk-phase', 'lifting');
    if (interruption === 'viewport') await page.setViewportSize({ width: 390, height: 844 });
    else await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page).toHaveURL(courseUrl);
    await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
    await expect(page.locator('main h1')).toBeVisible();
    await testInfo.attach('Interrupted transition', { body: await page.screenshot(), contentType: 'image/png' });
  });
}

test('invalid or out-of-range catalog pages retain published course links', async ({ page }, testInfo) => {
  for (const value of ['0', '-1', '99', 'NaN', '1.5', 'Infinity', '1&page=2']) {
    await page.goto(`/zh?page=${value}`);
    await expect(page.locator('[data-course-disk]')).toHaveCount(5);
    await expect(page.locator('.disk-pagination')).toHaveCount(0);
    await expect(page.locator(diskSelector)).toHaveAttribute('href', courseUrl);
  }
  await testInfo.attach('Catalog bounds', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});
