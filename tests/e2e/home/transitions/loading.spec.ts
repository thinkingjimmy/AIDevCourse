import { expect, test, type Page, type TestInfo } from '@playwright/test';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published disk catalog.');
test.use({ reducedMotion: 'no-preference', video: 'on' });

type Camera = { start: number; ready?: number; finished?: number; skipped?: number; duration?: number };
type MotionWindow = Window & { cameras?: Camera[] };

async function recordCamera(page: Page) {
  await page.addInitScript(() => {
    const start = document.startViewTransition.bind(document);
    const cameras: Camera[] = [];
    Object.assign(window, { cameras });
    document.startViewTransition = update => {
      const camera: Camera = { start: performance.now() };
      cameras.push(camera);
      const transition = start(update);
      void transition.ready.then(() => {
        camera.ready = performance.now();
        const movement = document.getAnimations().find(animation => animation instanceof CSSAnimation
          && animation.animationName === 'enter-course-window');
        camera.duration = Number(movement?.effect?.getTiming().duration);
      }, () => { camera.skipped = performance.now(); });
      void transition.finished.then(() => { camera.finished = performance.now(); });
      return transition;
    };
  });
}

async function expectFullCamera(page: Page, duration: number, testInfo: TestInfo, index = 0) {
  await page.waitForFunction(index => Boolean((window as MotionWindow).cameras?.[index]?.finished), index);
  const camera = await page.evaluate(index => (window as MotionWindow).cameras![index], index);
  await testInfo.attach('Complete camera timing', { body: JSON.stringify(camera), contentType: 'application/json' });
  expect(camera.skipped).toBeUndefined();
  expect(camera.ready).toBeDefined();
  expect(camera.duration).toBe(duration);
  expect(camera.finished! - camera.ready!).toBeGreaterThanOrEqual(duration - 40);
  await expect(page.locator('[data-course-zoom],.home-gallery[inert]')).toHaveCount(0);
}

for (const source of ['home', 'overview', 'lesson', 'design dictionary', 'animation dictionary'] as const) {
  test(`a slow route still plays the complete ${source} camera`, async ({ page }, testInfo) => {
    await recordCamera(page);
    const dictionary = source === 'design dictionary' ? 'vocabulary'
      : source === 'animation dictionary' ? 'animation-vocabulary' : undefined;
    const entering = source === 'home' || Boolean(dictionary);
    const destination = dictionary ? `/zh/${dictionary}/${dictionary === 'vocabulary' ? 'typography' : 'entrances-and-exits'}`
      : entering ? '/zh/courses/llm-101' : '/zh';
    let release!: () => void;
    const response = new Promise<void>(resolve => { release = resolve; });
    await page.route(url => url.pathname === destination && url.searchParams.has('_rsc'), async route => {
      await response;
      await route.continue();
    });
    try {
      await page.goto(dictionary ? '/zh?view=resources' : entering ? '/zh' : '/zh/courses/llm-101');
      if (source === 'lesson') {
        await page.locator('[data-slot="hero-primary-action"]').click();
        await expect(page.locator('article h1')).toBeVisible();
      }
      const original = page.url();
      const trigger = dictionary ? `[data-resource-disk="${dictionary}"]`
        : entering ? '[data-course-disk="llm-101"]' : '.site-header-logo';
      await page.locator(trigger).click();
      await page.waitForFunction(() => (window as MotionWindow).cameras?.length === 1);
      // Keep the response pending beyond the removed 180ms animation cutoff.
      await new Promise(resolve => setTimeout(resolve, 450));
      await expect(page).toHaveURL(original);
      expect(await page.evaluate(() => (window as MotionWindow).cameras![0].skipped)).toBeUndefined();
      release();
      await expect(page).toHaveURL(destination);
      await expectFullCamera(page, entering ? 420 : 320, testInfo);
      await testInfo.attach('Destination after delayed navigation', { body: await page.screenshot(), contentType: 'image/png' });
      if (dictionary) {
        const search = page.locator('[data-slot="sidebar-inner"] input');
        await search.fill('test');
        await expect(search).toHaveValue('test');
        await search.fill('');
        await page.locator('.site-header-logo').click();
        await expect(page).toHaveURL('/zh?view=resources');
        await expectFullCamera(page, 320, testInfo, 1);
        await expect(page.getByRole('region', { name: '学习资料', exact: true })).toBeVisible();
      }
    } finally { release(); }
  });
}

test('late Macintosh artwork still allows the complete return camera', async ({ page }, testInfo) => {
  await recordCamera(page);
  await page.route('**/images/home/pixel-macintosh.svg', async route => {
    await new Promise(resolve => setTimeout(resolve, 180));
    await route.continue();
  });
  await page.goto('/zh/courses/llm-101');
  await page.locator('.site-header-logo').click();
  await expect(page).toHaveURL('/zh');
  await expectFullCamera(page, 320, testInfo);
  await testInfo.attach('Home after late artwork', { body: await page.screenshot(), contentType: 'image/png' });
});

test('unavailable Macintosh artwork does not hold the return camera open', async ({ page }, testInfo) => {
  let release!: () => void;
  const response = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/images/home/pixel-macintosh.svg', async route => {
    await response;
    await route.continue();
  });
  try {
    await page.goto('/zh/courses/llm-101');
    await page.locator('.site-header-logo').click();
    await expect(page).toHaveURL('/zh');
    await expect(page.locator('[data-course-zoom],.home-gallery[inert]')).toHaveCount(0);
    release();
    await expect(page.locator('[data-slot="mac-drive"]')).toBeVisible();
    await testInfo.attach('Home after delayed artwork', { body: await page.screenshot(), contentType: 'image/png' });
    await page.locator('[data-course-disk="llm-101"]').click();
    await expect(page).toHaveURL('/zh/courses/llm-101');
    await expect(page.locator('[data-course-zoom]')).toHaveCount(0);
  } finally { release(); }
});
