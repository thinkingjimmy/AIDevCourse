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
  const macCatalog = page.locator('[data-gallery-view="courses"]');
  await expect(macCatalog.getByRole('heading', { level: 2 })).toHaveText(['入门', '中级', '词典']);
  const dictionaries = macCatalog.getByRole('region', { name: '词典', exact: true });
  await expect(dictionaries.getByRole('heading', { level: 3 })).toHaveText(['设计词典', '动画词典', '编程术语词典']);
  await expect(dictionaries.locator('[data-slot="course-disk"]')).toHaveCount(3);
  await expect(dictionaries.locator('.disk-dots i')).toHaveCount(0);
  await testInfo.attach('Mac course and dictionary disks', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

  await arrow.click();
  await expect(page).toHaveURL('/zh?view=resources');
  await expect(gallery).toHaveAttribute('data-home-view', 'resources');
  await expect(gallery).toHaveAttribute('data-home-switching', '');
  await expect(gallery).not.toHaveAttribute('data-home-switching');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(244, 247, 253)');
  const activeDevice = (await playStation.boundingBox())!;
  expect(activeDevice.x).toBeCloseTo(front.x, 0);
  expect(activeDevice.y).toBeCloseTo(front.y, 0);
  const blog = page.getByRole('region', { name: '博客', exact: true });
  const article = blog.locator('[data-blog-article="enterprise-ai-adoption-roi"]');
  const lid = article.locator('[data-slot="ps2-case-lid"]');
  await expect(blog.locator('[data-slot="ps2-case"]')).toHaveCount(4);
  await expect(page.getByRole('region', { name: /^(入门|中级|词典)$/ })).toHaveCount(0);
  await testInfo.attach('PS2 and closed blog cases', { body: await page.screenshot(), contentType: 'image/png' });
  await expect(lid).toHaveCSS('transform', 'none');
  await article.hover();
  await expect(lid).toHaveCSS('transform', 'none');

  await article.click();
  await expect(gallery.locator('.flying-optical-disc')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(gallery).toHaveAttribute('data-disk-phase', 'idle');
  await expect(gallery.locator('.flying-optical-disc')).toHaveCount(0);
  await expect(lid).toHaveCSS('transform', 'none');
  await expect(article).toBeFocused();
  await expect(article).not.toHaveAttribute('data-in-drive');
  await article.click();
  await expect(page).toHaveURL('/zh/blog/enterprise-ai-adoption-roi');
  await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
  await page.goBack();
  await expect(page).toHaveURL('/zh?view=resources');
  await expect(blog).toBeVisible();
  await expect(lid).toHaveCSS('transform', 'none');
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

for (const [input, width] of [['mouse', 1440], ['touch', 320]] as const) {
  test(`the PS2 case opens in place and sends the disc into the drive with ${input}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, hasTouch: input === 'touch',
      reducedMotion: 'no-preference' });
    try {
      if (input === 'touch') await context.addInitScript(() => Object.defineProperty(document, 'startViewTransition', { value: undefined }));
      const page = await context.newPage();
      await page.goto('/zh?view=resources');
      await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--home-masthead-height'));
      await page.locator('[data-slot="home-playstation"] img').evaluate(image => (image as HTMLImageElement).decode());
      const articleCase = page.locator('[data-blog-article="gpt-6-2-vs-opus-5-5"] [data-slot="ps2-case"]');
      await articleCase.scrollIntoViewIfNeeded();

      const insertion = articleCase.evaluate(box => {
        const gallery = box.closest<HTMLElement>('.home-gallery')!;
        const lid = box.querySelector('[data-slot="ps2-case-lid"]')!;
        const tray = gallery.querySelector('[data-slot="playstation-tray"]')!;
        const original = box.querySelector('[data-slot="optical-disc"]')!;
        const sample = () => {
          const base = box.getBoundingClientRect(), host = gallery.getBoundingClientRect(), cover = lid.getBoundingClientRect();
          const slot = tray.getBoundingClientRect();
          const disc = gallery.querySelector('.flying-optical-disc');
          const face = disc?.getBoundingClientRect();
          const start = original.getBoundingClientRect();
          return {
            phase: gallery.dataset.diskPhase,
            casePosition: { x: base.x - host.x, y: base.y - host.y, width: base.width, height: base.height },
            lidLeft: cover.left, lidRight: cover.right, caseLeft: base.left,
            discInCase: getComputedStyle(original).opacity,
            flight: face && {
              fromCase: Math.hypot(face.x + face.width / 2 - start.x - start.width / 2, face.y + face.height / 2 - start.y - start.height / 2),
              centerOffset: face.x + face.width / 2 - (slot.x + slot.width / 2),
              top: face.top - slot.top, bottom: face.bottom - slot.top, height: face.height,
              trayHeight: slot.height, opacity: getComputedStyle(disc!).opacity,
            },
          };
        };
        return new Promise<ReturnType<typeof sample>[]>(resolve => {
          const frames = [sample()];
          let frame = 0;
          const finish = () => { cancelAnimationFrame(frame); clearTimeout(timeout); resolve(frames); };
          const timeout = setTimeout(finish, 5000);
          const record = () => {
            if (!gallery.isConnected || gallery.dataset.diskPhase === 'navigating') { finish(); return; }
            if (gallery.dataset.diskPhase !== 'idle') frames.push(sample());
            frame = requestAnimationFrame(record);
          };
          frame = requestAnimationFrame(record);
        });
      });
      if (input === 'touch') await articleCase.tap();
      else await articleCase.click();
      const frames = await insertion;
      await testInfo.attach('PS2 case and tray geometry', { body: JSON.stringify(frames, null, 2), contentType: 'application/json' });

      const [closed] = frames;
      expect(closed.lidLeft).toBeCloseTo(closed.caseLeft, 1);
      expect(closed.lidRight).toBeCloseTo(closed.caseLeft + closed.casePosition.width, 1);
      expect(frames.some(frame => frame.phase === 'opening' && !frame.flight && frame.lidRight < closed.lidRight - 4)).toBe(true);
      const lifting = frames.filter(frame => frame.phase === 'lifting' && frame.flight);
      const inserting = frames.filter(frame => frame.phase === 'inserting' && frame.flight);
      expect(lifting.length).toBeGreaterThan(1);
      expect(inserting.length).toBeGreaterThan(1);
      expect(Math.min(...lifting.map(frame => frame.flight!.fromCase))).toBeLessThan(32);
      for (const frame of [...lifting, ...inserting]) {
        expect(frame.casePosition).toEqual(closed.casePosition);
        expect(frame.lidLeft).toBeGreaterThanOrEqual(0);
        expect(frame.lidLeft).toBeLessThan(frame.caseLeft - 4);
        expect(frame.lidRight).toBeCloseTo(frame.caseLeft, 1);
        expect(frame.discInCase).toBe('0');
      }
      const seated = inserting[0].flight!, retracted = inserting.at(-1)!.flight!;
      expect(Math.abs(seated.centerOffset)).toBeLessThan(2);
      expect(seated.top).toBeGreaterThanOrEqual(0);
      expect(seated.bottom).toBeLessThanOrEqual(seated.trayHeight);
      expect(retracted.bottom).toBeLessThan(seated.bottom / 2);
      expect(retracted.height).toBeCloseTo(seated.height, 0);
      expect(retracted.opacity).toBe('1');
      await expect(page).toHaveURL('/zh/blog/gpt-6-2-vs-opus-5-5');
      await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
    } finally {
      await context.close();
    }
  });
}

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
    const article = page.getByRole('region', { name: '博客', exact: true }).locator('[data-blog-article="enterprise-ai-adoption-roi"]');
    await expect(article).toBeVisible();
    await page.getByRole('link', { name: '向左切到课程', exact: true }).click();
    await expect(page).toHaveURL('/zh');
    await expect(page.getByRole('region', { name: '入门', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'PS2 · 学习资料', exact: true }).press('Enter');
    await article.press('Enter');
    await expect(page).toHaveURL('/zh/blog/enterprise-ai-adoption-roi');
    await expect(page.locator('article h1')).toContainText('用 AI 的 ROI');
  } finally { await context.close(); }
});

test('blog and dictionary pages return to their home devices without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  try {
    const page = await context.newPage();
    for (const [path, destination, grid] of [
      ['/zh/blog/no-loyalty-to-ai-coding-tools', '/zh?view=resources', 'blog-grid'],
      ['/zh/vocabulary/typography', '/zh', 'dictionary-grid'],
      ['/zh/animation-vocabulary/entrances-and-exits', '/zh', 'dictionary-grid'],
      ['/zh/programming-vocabulary/static-website', '/zh', 'dictionary-grid'],
      ['/fr/vocabulary/typography', '/fr', 'dictionary-grid'],
    ]) {
      await page.goto(path);
      const header = page.getByRole('banner');
      const logo = header.locator('.site-header-logo');
      await expect(page.locator('[data-slot="site-window"]')).toHaveCSS('background-color', 'rgb(244, 247, 253)');
      await expect(header).toHaveCSS('border-bottom-color', 'rgb(53, 84, 134)');
      await expect(logo).toHaveAttribute('href', destination);
      await logo.click();
      await expect(page).toHaveURL(destination);
      await expect(page.locator(`[data-slot="${grid}"]`)).toBeVisible();
    }
  } finally { await context.close(); }
});
