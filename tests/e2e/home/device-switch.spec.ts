import { expect, test } from '@playwright/test';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published homepage catalog.');

test('pixel arrows switch devices, theme, and media and return to the selected view', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/zh');
  const gallery = page.locator('.home-gallery');
  const arrow = page.getByRole('link', { name: '向右切到学习资料', exact: true });
  await expect(arrow).toHaveAttribute('href', '/zh?view=resources');
  await arrow.hover();
  await expect(arrow).toHaveCSS('cursor', 'pointer');
  const mac = page.locator('[data-home-device="courses"]');
  const playStation = page.locator('[data-home-device="resources"]');
  const front = (await mac.boundingBox())!;
  const rear = (await playStation.boundingBox())!;
  expect(rear.x).toBeLessThan(front.x);
  expect(rear.y).toBeLessThan(front.y);
  await testInfo.attach('Mac and pixel arrows', { body: await page.screenshot(), contentType: 'image/png' });

  await arrow.click();
  await expect(page).toHaveURL('/zh?view=resources');
  await expect(gallery).toHaveAttribute('data-home-view', 'resources');
  await expect(gallery).toHaveAttribute('data-home-switching', '');
  await expect(gallery).not.toHaveAttribute('data-home-switching');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(244, 247, 253)');
  const activeDevice = (await playStation.boundingBox())!;
  expect(activeDevice.x).toBeCloseTo(front.x, 0);
  expect(activeDevice.y).toBeCloseTo(front.y, 0);
  const resources = page.getByRole('region', { name: '学习资料', exact: true });
  await expect(resources.getByRole('heading', { level: 3 })).toHaveText(['博客', '设计词典', '动画词典', '编程术语词典']);
  await expect(page.getByRole('region', { name: /^(入门|中级)$/ })).toHaveCount(0);
  const discs = await resources.locator('.optical-disc-surface').evaluateAll(elements => elements.map(element => {
    const { width, height } = element.getBoundingClientRect();
    return { width, height, radius: getComputedStyle(element).borderTopLeftRadius };
  }));
  expect(discs).toEqual(Array.from({ length: 4 }, () => ({ width: 166, height: 166, radius: '50%' })));
  await testInfo.attach('PS2 and printed discs', { body: await page.screenshot(), contentType: 'image/png' });

  const canZoom = await page.evaluate(() => typeof document.startViewTransition === 'function');
  await resources.getByRole('link', { name: '设计词典', exact: true }).click();
  if (canZoom) {
    await expect(gallery).toHaveAttribute('data-disk-phase', 'lifting');
    await expect(page.locator('.flying-optical-disc')).toBeVisible();
  }
  await expect(page).toHaveURL('/zh/vocabulary/typography');
  await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
  await page.goBack();
  await expect(page).toHaveURL('/zh?view=resources');
  await expect(resources).toBeVisible();
  await expect(gallery).not.toHaveAttribute('inert');
  const backArrow = page.getByRole('link', { name: '向左切到课程', exact: true });
  await backArrow.hover();
  await expect(backArrow).toHaveCSS('cursor', 'pointer');
  await backArrow.click();
  await expect(page).toHaveURL('/zh');
  await expect(gallery).not.toHaveAttribute('data-home-switching');
  const restored = (await mac.boundingBox())!;
  expect(restored.x).toBeCloseTo(front.x, 0);
  expect(restored.y).toBeCloseTo(front.y, 0);
  expect(errors).toEqual([]);
});

test('the disc seats in the PS2 tray and slides into the drive', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/zh?view=resources');
  test.skip(!await page.evaluate(() => typeof document.startViewTransition === 'function'), 'The browser uses native navigation.');
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--home-masthead-height'));
  await page.locator('[data-slot="home-playstation"] img').evaluate(image => (image as HTMLImageElement).decode());

  const insertion = page.evaluate(() => {
    const gallery = document.querySelector<HTMLElement>('.home-gallery')!;
    const tray = gallery.querySelector('[data-slot="playstation-tray"]')!;
    const sample = (disc: Element) => {
      const face = disc.getBoundingClientRect(), slot = tray.getBoundingClientRect();
      return {
        centerOffset: face.left + face.width / 2 - (slot.left + slot.width / 2),
        top: face.top - slot.top, bottom: face.bottom - slot.top, height: face.height,
        trayHeight: slot.height, opacity: getComputedStyle(disc).opacity,
      };
    };
    return new Promise<ReturnType<typeof sample>[]>(resolve => {
      const frames: ReturnType<typeof sample>[] = [];
      let frame = 0;
      const finish = () => { cancelAnimationFrame(frame); clearTimeout(timeout); resolve(frames); };
      const timeout = setTimeout(finish, 3000);
      const record = () => {
        if (!gallery.isConnected || gallery.dataset.diskPhase === 'navigating') { finish(); return; }
        if (gallery.dataset.diskPhase === 'inserting') {
          const disc = gallery.querySelector('.flying-optical-disc');
          if (disc) frames.push(sample(disc));
        }
        frame = requestAnimationFrame(record);
      };
      frame = requestAnimationFrame(record);
    });
  });
  await page.getByRole('link', { name: '设计词典', exact: true }).click();
  const frames = await insertion;
  await testInfo.attach('PS2 tray geometry during insertion', { body: JSON.stringify(frames, null, 2), contentType: 'application/json' });
  expect(frames.length).toBeGreaterThanOrEqual(2);
  const seated = frames[0], retracted = frames.at(-1)!;
  expect(Math.abs(seated.centerOffset)).toBeLessThan(2);
  expect(seated.top).toBeGreaterThanOrEqual(0);
  expect(seated.bottom).toBeLessThanOrEqual(seated.trayHeight);
  expect(retracted.bottom).toBeLessThan(seated.bottom / 2);
  expect(retracted.height).toBeCloseTo(seated.height, 0);
  expect(retracted.opacity).toBe('1');
  await expect(page).toHaveURL('/zh/vocabulary/typography');
  await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
});

for (const [input, width] of [['mouse', 1440], ['touch', 390]] as const) {
  test(`the exposed rear device switches views with ${input}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, hasTouch: input === 'touch',
      reducedMotion: 'no-preference' });
    try {
      const page = await context.newPage();
      await page.goto('/zh');
      const gallery = page.locator('.home-gallery');
      const activate = ({ x, y }: { x: number; y: number }) => input === 'touch'
        ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
      for (const [front, rear, name, destination, exposedOffset] of [
        ['courses', 'resources', 'PS2 · 学习资料', '/zh?view=resources', .07],
        ['resources', 'courses', 'Macintosh · 课程', '/zh', .02],
      ] as const) {
        const frontBox = (await page.locator(`[data-home-device="${front}"]`).boundingBox())!;
        const rearBox = (await page.locator(`[data-home-device="${rear}"]`).boundingBox())!;
        const y = rearBox.y + rearBox.height * .45;
        const exposed = { x: frontBox.x + frontBox.width * exposedOffset, y };
        const covered = { x: frontBox.x + frontBox.width * .4, y };
        const hits = await page.evaluate(points => points.map(({ x, y }) =>
          Boolean(document.elementFromPoint(x, y)?.closest('[data-slot="rear-device-switch"]'))), [exposed, covered]);
        expect(hits).toEqual([true, false]);
        const original = page.url();
        await activate(covered);
        await expect(page).toHaveURL(original);
        const link = page.getByRole('link', { name, exact: true });
        await expect(link).toHaveAttribute('href', destination);
        await expect(link).toHaveCSS('cursor', 'pointer');
        await activate(exposed);
        await expect(gallery).toHaveAttribute('data-home-switching', '');
        await expect(page).toHaveURL(destination);
        await expect(gallery).not.toHaveAttribute('data-home-switching');
      }
    } finally { await context.close(); }
  });
}

test('each media deck clears before the other appears', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/zh');
  for (const [label, from, to] of [
    ['向右切到学习资料', 'courses', 'resources'],
    ['向左切到课程', 'resources', 'courses'],
  ] as const) {
    const arrow = page.getByRole('link', { name: label, exact: true });
    const observation = await arrow.evaluateHandle((trigger, { from, to }) => {
      const gallery = trigger.closest('.home-gallery')!;
      const panel = (view: string) => gallery.querySelector<HTMLElement>(`[data-gallery-view="${view}"]`)!;
      const outgoing = panel(from), incoming = panel(to);
      const opacity = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        return element.hidden || style.visibility !== 'visible' ? 0 : Number(style.opacity);
      };
      const frames = new Promise<{ elapsed: number; outgoing: number; incoming: number }[]>(resolve => {
        trigger.addEventListener('click', () => {
          const start = performance.now();
          const samples: { elapsed: number; outgoing: number; incoming: number }[] = [];
          const sample = (now: number) => {
            const elapsed = Math.round(now - start);
            samples.push({ elapsed, outgoing: opacity(outgoing), incoming: opacity(incoming) });
            if (elapsed < 800) requestAnimationFrame(sample);
            else resolve(samples);
          };
          requestAnimationFrame(sample);
        }, { once: true, capture: true });
      });
      return { frames };
    }, { from, to });
    await arrow.click();
    const frames = await observation.evaluate(({ frames }) => frames);
    await observation.dispose();
    await testInfo.attach(`${from} to ${to} frames`, { body: JSON.stringify(frames), contentType: 'application/json' });
    const firstEntry = frames.findIndex(frame => frame.incoming > .01);
    expect(firstEntry).toBeGreaterThanOrEqual(0);
    expect(frames.slice(firstEntry).filter(frame => frame.outgoing > .01)).toEqual([]);
    expect(frames.at(-1)).toMatchObject({ outgoing: 0, incoming: 1 });
  }
});

test('pixel arrows support keyboard switching and reduced motion on a narrow screen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/zh');
  await page.getByRole('link', { name: '向左切到学习资料', exact: true }).press('ArrowRight');
  await expect(page).toHaveURL('/zh?view=resources');
  await expect(page.locator('.home-gallery')).not.toHaveAttribute('data-home-switching');
  const arrows = page.locator('.gallery-view-arrow');
  await expect(arrows.last()).toBeFocused();
  const boxes = await arrows.evaluateAll(elements => elements.map(element => {
    const { width, height, left, right } = element.getBoundingClientRect();
    return { width, height, fits: left >= 0 && right <= innerWidth };
  }));
  expect(boxes).toEqual([{ width: 44, height: 44, fits: true }, { width: 44, height: 44, fits: true }]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await testInfo.attach('Narrow PS2 view', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  await arrows.last().press('ArrowLeft');
  await expect(page).toHaveURL('/zh');
  await expect(page.getByRole('region', { name: '入门', exact: true })).toBeVisible();
});

test('the view links work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/zh');
    await page.getByRole('link', { name: '向右切到学习资料', exact: true }).click();
    await expect(page).toHaveURL('/zh?view=resources');
    const blog = page.getByRole('region', { name: '学习资料', exact: true }).getByRole('link', { name: '博客', exact: true });
    await expect(blog).toBeVisible();
    await page.getByRole('link', { name: '向左切到课程', exact: true }).click();
    await expect(page).toHaveURL('/zh');
    await expect(page.getByRole('region', { name: '入门', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'PS2 · 学习资料', exact: true }).press('Enter');
    await blog.click();
    await expect(page).toHaveURL('/zh/courses/blog');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('博客');
  } finally { await context.close(); }
});

test('blog and dictionary pages keep the PS2 theme and return link without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  try {
    const page = await context.newPage();
    for (const [path, destination] of [
      ['/zh/courses/blog', '/zh?view=resources'],
      ['/zh/courses/blog/no-loyalty-to-ai-coding-tools', '/zh?view=resources'],
      ['/zh/vocabulary/typography', '/zh?view=resources'],
      ['/zh/animation-vocabulary/entrances-and-exits', '/zh?view=resources'],
      ['/zh/programming-vocabulary/static-website', '/zh?view=resources'],
      ['/fr/vocabulary/typography', '/fr?view=resources'],
    ]) {
      await page.goto(path);
      const header = page.getByRole('banner');
      const logo = header.locator('.site-header-logo');
      await expect(page.locator('[data-slot="site-window"]')).toHaveCSS('background-color', 'rgb(244, 247, 253)');
      await expect(header).toHaveCSS('border-bottom-color', 'rgb(53, 84, 134)');
      if (path === '/zh/courses/blog') await expect(page.locator('.course-overview-hero [data-slot="optical-disc"]')).toBeVisible();
      await expect(logo).toHaveAttribute('href', destination);
      await logo.click();
      await expect(page).toHaveURL(destination);
      await expect(page.locator('[data-slot="resource-grid"]')).toBeVisible();
    }
  } finally { await context.close(); }
});
