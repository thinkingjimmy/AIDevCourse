import { expect, test, type Page } from '@playwright/test';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published disk catalog.');

// Firefox screenshots omit transition snapshots: https://bugzilla.mozilla.org/show_bug.cgi?id=2008417
// Check geometry in every engine; use Chromium and WebKit captures for visual review.
const pauseCamera = `
  :root[data-course-zoom]::view-transition-old(mac-home),
  :root[data-course-zoom]::view-transition-new(mac-home),
  :root[data-course-zoom]::view-transition-group(root),
  :root[data-course-zoom]::view-transition-old(root),
  :root[data-course-zoom]::view-transition-new(root) { animation-play-state: paused !important; }
`;

async function cameraFrame(page: Page, fraction: number) {
  return page.evaluate(fraction => {
    const root = document.documentElement;
    const returning = root.dataset.courseZoom === 'out';
    const names = ['approach-mac-screen', 'enter-course-window', 'reveal-course-window', 'frame-course-content'];
    for (const animation of document.getAnimations()) {
      if (animation instanceof CSSAnimation && names.includes(animation.animationName)) {
        animation.currentTime = Number(animation.effect!.getTiming().duration) * fraction;
      }
    }
    function snapshot(pseudo: string) {
      const css = getComputedStyle(root, `::view-transition-${pseudo}`);
      const m = new DOMMatrix(css.transform);
      return { x: m.e, y: m.f, scaleX: m.a, scaleY: m.d, opacity: Number(css.opacity) };
    }
    const aperture = getComputedStyle(root, '::view-transition-image-pair(root)');
    return {
      home: snapshot(`${returning ? 'new' : 'old'}(mac-home)`), course: snapshot('group(root)'), content: snapshot(`${returning ? 'old' : 'new'}(root)`),
      aperture: { x: parseFloat(aperture.left), y: parseFloat(aperture.top), width: parseFloat(aperture.width), height: parseFloat(aperture.height) },
      width: root.clientWidth, height: root.clientHeight,
    };
  }, fraction);
}

for (const action of ['back', 'resize', 'reduce motion'] as const) {
  test(`${action} interrupts the return camera after home has mounted`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/zh/courses/getting-started');
    await page.addStyleTag({ content: pauseCamera });
    await page.getByRole('banner').locator('.site-header-logo').click();
    await page.waitForFunction(() => document.documentElement.dataset.courseZoom === 'out'
      && document.getAnimations().some(animation => animation instanceof CSSAnimation && animation.animationName === 'enter-course-window'));
    if (action === 'back') {
      await page.goBack();
      await expect(page).toHaveURL('/zh/courses/getting-started');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    } else {
      if (action === 'resize') await page.setViewportSize({ width: 390, height: 844 });
      else await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page).toHaveURL('/zh');
      await expect(page.locator('[data-course-disk="ai-coding"]')).toBeVisible();
    }
    await expect(page.locator('[data-course-zoom],[data-in-drive],.home-gallery[inert]')).toHaveCount(0);
  });
}

for (const action of ['back', 'reduce motion'] as const) {
  test(`${action} interrupts a zoom after the course has mounted`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/zh');
    await page.addStyleTag({ content: pauseCamera });
    const disk = page.locator('[data-course-disk="ai-coding"]');
    await disk.click();
    await page.waitForFunction(() => document.getAnimations().some(animation =>
      animation instanceof CSSAnimation && animation.animationName === 'enter-course-window'));

    if (action === 'back') {
      await page.goBack();
      await expect(page).toHaveURL('/zh');
      await expect(disk).toBeVisible();
      await expect(page.locator('.home-gallery')).not.toHaveAttribute('inert');
    } else {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page).toHaveURL('/zh/courses/getting-started');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
    await expect(page.locator('[data-course-zoom],[data-in-drive]')).toHaveCount(0);
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`the home button returns a direct course visit to the Mac screen at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/zh/courses/getting-started');
    const freeze = await page.addStyleTag({ content: pauseCamera });
    await page.getByRole('banner').locator('.site-header-logo').click();
    await page.waitForFunction(() => document.documentElement.dataset.courseZoom === 'out'
      && document.getAnimations().some(animation => animation instanceof CSSAnimation && animation.animationName === 'enter-course-window'));
    await expect(page).toHaveURL('/zh');
    const glass = page.locator('[data-slot="home-macintosh"] [data-slot="mac-screen"]');
    const bounds = (await glass.boundingBox())!;
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };

    const start = await cameraFrame(page, 0);
    expect(start.course).toMatchObject({ scaleX: 1, scaleY: 1, opacity: 1 });
    expect(start.course.x).toBeCloseTo(0, 3);
    expect(start.course.y).toBeCloseTo(0, 3);
    expect(start.content.scaleX).toBeCloseTo(1, 3);
    expect(start.home.scaleX).toBeGreaterThan(1);
    const middle = await cameraFrame(page, .55);
    expect(middle.course.scaleX).toBeLessThan(1);
    expect(middle.course.scaleX).toBeCloseTo(middle.course.scaleY, 4);
    expect(middle.home.scaleX).toBeGreaterThan(1);
    expect(middle.home.scaleX).toBeLessThan(start.home.scaleX);
    expect(middle.home.scaleY).toBeCloseTo(middle.home.scaleX, 3);
    expect(middle.home.x + center.x * middle.home.scaleX).toBeCloseTo(middle.course.x + middle.width * middle.course.scaleX / 2, 0);
    expect(middle.home.y + center.y * middle.home.scaleY).toBeCloseTo(middle.course.y + middle.height * middle.course.scaleY / 2, 0);
    await testInfo.attach('Course returning inside the bezel', { body: await page.screenshot(), contentType: 'image/png' });

    const end = await cameraFrame(page, 1);
    expect(end.home).toMatchObject({ scaleX: 1, scaleY: 1 });
    expect(end.home.x).toBeCloseTo(0, 3);
    expect(end.home.y).toBeCloseTo(0, 3);
    expect(end.course.opacity).toBe(0);
    expect(end.course.x + end.aperture.x * end.course.scaleX).toBeCloseTo(bounds.x, 0);
    expect(end.course.y + end.aperture.y * end.course.scaleY).toBeCloseTo(bounds.y, 0);
    expect(end.aperture.width * end.course.scaleX).toBeCloseTo(bounds.width, 0);
    expect(end.aperture.height * end.course.scaleY).toBeCloseTo(bounds.height, 0);
    await freeze.evaluate(style => style.parentNode?.removeChild(style));
    await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
    await expect(page.locator('.home-gallery')).toHaveAttribute('data-disk-phase', 'idle');
    await expect(page.locator('.home-gallery')).not.toHaveAttribute('inert');
    expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--course-camera-from'))).toBe('');
    await testInfo.attach('Return camera geometry', { body: JSON.stringify({ bounds, start, middle, end }), contentType: 'application/json' });
    await testInfo.attach('Home after returning', { body: await page.screenshot(), contentType: 'image/png' });
    await page.locator('[data-course-disk="ai-coding"]').click();
    await expect(page).toHaveURL('/zh/courses/getting-started');
    await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
  });

  test(`camera tracks the actual Mac screen at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/zh');
    const freeze = await page.addStyleTag({ content: pauseCamera });
    const glass = page.locator('[data-slot="mac-screen"]');
    await expect(glass.locator('use').first()).toBeVisible();
    const bounds = (await glass.boundingBox())!;
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    await page.locator('[data-course-disk="ai-coding"]').click();
    await page.waitForFunction(() => document.getAnimations().some(animation =>
      animation instanceof CSSAnimation && animation.animationName === 'enter-course-window'));

    const start = await cameraFrame(page, 0);
    expect(start.home.scaleX).toBe(1);
    expect(start.course.opacity).toBe(0);
    expect(start.course.scaleX).toBeCloseTo(start.course.scaleY, 4);
    expect(start.course.x + start.width * start.course.scaleX / 2).toBeCloseTo(center.x, 0);
    expect(start.course.y + start.height * start.course.scaleY / 2).toBeCloseTo(center.y, 0);
    expect(start.course.x + start.aperture.x * start.course.scaleX).toBeCloseTo(bounds.x, 0);
    expect(start.course.y + start.aperture.y * start.course.scaleY).toBeCloseTo(bounds.y, 0);
    expect(start.aperture.width * start.course.scaleX).toBeCloseTo(bounds.width, 0);
    expect(start.aperture.height * start.course.scaleY).toBeCloseTo(bounds.height, 0);
    expect(start.width * start.course.scaleX * start.content.scaleX).toBeGreaterThanOrEqual(bounds.width - 1);
    expect(start.height * start.course.scaleY * start.content.scaleY).toBeGreaterThanOrEqual(bounds.height - 1);

    const middle = await cameraFrame(page, .45);
    expect(middle.home.scaleX).toBeGreaterThan(1);
    expect(middle.home.scaleY).toBeCloseTo(middle.home.scaleX, 3);
    expect(middle.course.scaleX).toBeGreaterThan(start.course.scaleX);
    expect(middle.course.scaleY).toBeCloseTo(middle.course.scaleX, 3);
    expect(middle.home.x + center.x * middle.home.scaleX).toBeCloseTo(middle.course.x + middle.width * middle.course.scaleX / 2, 0);
    expect(middle.home.y + center.y * middle.home.scaleY).toBeCloseTo(middle.course.y + middle.height * middle.course.scaleY / 2, 0);
    await testInfo.attach('Camera inside the bezel', { body: await page.screenshot(), contentType: 'image/png' });

    const end = await cameraFrame(page, 1);
    expect(end.course.x).toBeCloseTo(0, 3);
    expect(end.course.y).toBeCloseTo(0, 3);
    expect(end.course).toMatchObject({ scaleX: 1, scaleY: 1, opacity: 1 });
    expect(end.content.scaleX).toBeCloseTo(1, 3);
    await freeze.evaluate(style => style.parentNode?.removeChild(style));
    await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('从想法到作品');
    await testInfo.attach('Camera geometry', { body: JSON.stringify({ bounds, start, middle, end }), contentType: 'application/json' });
  });
}
