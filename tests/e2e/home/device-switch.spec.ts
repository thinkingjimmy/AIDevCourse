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
  await expect(page.getByRole('region', { name: '系统课程', exact: true })).toHaveCount(0);
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
    await expect(gallery).toHaveAttribute('data-disk-phase', 'inserting');
  }
  await expect(page).toHaveURL('/zh/vocabulary/typography');
  await expect(page.locator('html')).not.toHaveAttribute('data-course-zoom');
  await page.goBack();
  await expect(page).toHaveURL('/zh?view=resources');
  await expect(resources).toBeVisible();
  await expect(gallery).not.toHaveAttribute('inert');
  const backArrow = page.getByRole('link', { name: '向左切到系统课程', exact: true });
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
  await expect(page.getByRole('region', { name: '系统课程', exact: true })).toBeVisible();
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
    await page.getByRole('link', { name: '向左切到系统课程', exact: true }).click();
    await expect(page).toHaveURL('/zh');
    await expect(page.getByRole('region', { name: '系统课程', exact: true })).toBeVisible();
    await page.getByRole('link', { name: '向右切到学习资料', exact: true }).click();
    await blog.click();
    await expect(page).toHaveURL('/zh/courses/blog');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('博客');
  } finally { await context.close(); }
});
