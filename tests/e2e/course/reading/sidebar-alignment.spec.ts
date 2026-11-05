import { test, expect, type Locator } from '@playwright/test';
import { readCatalog } from '../../../../src/lib/content/manifest';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published sidebar navigation.');

for (const width of [1440, 390]) {
  test(`sidebar hover uses green without replacing the active chapter at ${width}px`, async ({ page, browserName }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/zh/courses/llm-101/what-is-a-token');
    if (width < 961) await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
    const sidebar = page.locator(width < 961 ? '[data-mobile="true"]' : '[data-slot="sidebar-inner"]');
    await expect(sidebar).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const active = sidebar.locator('[data-slot="sidebar-menu-sub-button"][data-active="true"]');
    const sibling = sidebar.locator('[data-slot="sidebar-menu-sub-button"][data-active="false"]').first();
    const currentColor = await active.evaluate(element => getComputedStyle(element).backgroundColor);
    await sibling.hover();
    await expect(sibling).toHaveCSS('color', 'rgb(49, 86, 75)');
    const hoverColor = await sibling.evaluate(element => getComputedStyle(element).backgroundColor);
    expect(hoverColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(hoverColor).not.toBe(currentColor);
    await expect(active).toHaveCSS('background-color', currentColor);
    const moduleToggle = sidebar.locator('[data-sidebar="menu-button"]').first();
    await moduleToggle.hover();
    await expect(moduleToggle).toHaveCSS('background-color', hoverColor);
    await active.hover();
    await expect(active).toHaveCSS('background-color', currentColor);
    await moduleToggle.focus();
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    await expect(sibling).toBeFocused();
    await expect(sibling).toHaveCSS('outline-color', 'rgb(49, 86, 75)');
    await sibling.hover();
    await testInfo.attach(`sidebar-colors-${width}`, { body: await sidebar.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    await testInfo.attach('sidebar-color-states', { body: JSON.stringify({ hover: hoverColor, active: currentColor }, null, 2), contentType: 'application/json' });
  });
}

async function textBounds(locator: Locator) {
  return locator.evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element.firstChild!);
    const box = range.getBoundingClientRect();
    const lastLine = [...range.getClientRects()].at(-1)!;
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, lastRight: lastLine.right };
  });
}

test('sidebar text aligns within the Mac window and module arrows follow hover and keyboard focus', async ({ page, browserName }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  const evidence = [];
  for (const course of readCatalog().courses.filter(course => course.slug === 'llm-101')) {
    await page.goto(course.lessons[0].url);
    await page.evaluate(() => document.fonts.ready);
    const sidebar = page.locator('[data-slot="sidebar-inner"]');
    const title = sidebar.getByRole('link', { name: course.title, exact: true });
    const moduleToggle = sidebar.locator('[data-sidebar="menu-button"]').first();
    const arrow = moduleToggle.locator('svg');
    const moduleNumber = moduleToggle.locator('> span').first();
    const lessonNumber = sidebar.locator('[data-sidebar="menu-sub-button"] > span:first-child').first();
    await expect(lessonNumber).toBeVisible();
    const left = (await textBounds(title)).left;
    const positions = { course: (await textBounds(title)).left,
      module: (await moduleNumber.boundingBox())!.x, lesson: (await lessonNumber.boundingBox())!.x };
    for (const position of Object.values(positions)) expect(position).toBeCloseTo(left, 1);
    await page.mouse.move(900, 80);
    await expect(arrow).toHaveCSS('opacity', '0');
    const resting = (await textBounds(moduleToggle.locator('> span').last()));
    const row = (await moduleToggle.boundingBox())!;
    await moduleToggle.hover();
    await expect(arrow).toHaveCSS('opacity', '1');
    expect(await textBounds(moduleToggle.locator('> span').last())).toEqual(resting);
    expect((await arrow.boundingBox())!.x - resting.lastRight).toBeCloseTo(4, 1);
    expect(await moduleToggle.boundingBox()).toEqual(row);
    const path = testInfo.outputPath(`module-hover-${course.locale}.png`);
    await page.screenshot({ path, animations: 'disabled' });
    await testInfo.attach(`Module hover ${course.locale}`, { path, contentType: 'image/png' });
    await page.mouse.move(900, 80);
    await expect(arrow).toHaveCSS('opacity', '0');
    await title.focus();
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    const toggle = sidebar.locator('[data-sidebar="trigger"]');
    await expect(toggle).toBeFocused();
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    await expect(moduleToggle).toBeFocused();
    await expect(arrow).toHaveCSS('opacity', '1');
    await moduleToggle.press('Enter');
    await expect(moduleToggle).toHaveAttribute('aria-expanded', 'false');
    await moduleToggle.press('Enter');
    await expect(moduleToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(lessonNumber).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeInViewport();
    expect((await page.locator('[data-slot="sidebar-container"]').boundingBox())!.width).toBe(48);
    await toggle.click();
    await expect(title).toBeVisible();
    evidence.push({ locale: course.locale, positions });
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
  const logoLeft = (await textBounds(page.locator('[data-slot="sidebar-header"] a'))).left;
  const title = page.locator('[data-slot="sidebar-header"] a');
  expect((await textBounds(title)).left).toBeCloseTo(logoLeft, 1);
  expect((await page.locator('[data-sidebar="menu-button"] > span').first().boundingBox())!.x).toBeCloseTo(logoLeft, 1);
  await testInfo.attach('Sidebar alignment', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('touch module arrows stay visible and retain full-row controls', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 844 }, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.goto('/zh/courses/llm-101/what-a-language-model-does');
    await page.locator('[data-slot="mobile-sidebar-trigger"]').tap();
    const sheet = page.getByRole('dialog', { name: '课程目录', exact: true });
    const moduleToggle = sheet.locator('[data-sidebar="menu-button"]').first();
    await expect(moduleToggle.locator('svg')).toHaveCSS('opacity', '1');
    expect((await moduleToggle.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    const positions = [
      (await textBounds(sheet.getByRole('link', { name: 'LLM 101', exact: true }))).left,
      (await moduleToggle.locator('> span').first().boundingBox())!.x,
      (await sheet.locator('[data-sidebar="menu-sub-button"] > span').first().boundingBox())!.x,
    ];
    expect(new Set(positions).size).toBe(1);
    await moduleToggle.tap();
    await expect(moduleToggle).toHaveAttribute('aria-expanded', 'false');
    await moduleToggle.tap();
    await expect(moduleToggle).toHaveAttribute('aria-expanded', 'true');
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
    await expect(moduleToggle.locator('svg')).toHaveCSS('opacity', '1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const path = testInfo.outputPath('touch-sidebar.png');
    await page.screenshot({ path, animations: 'disabled' });
    await testInfo.attach('Touch sidebar', { path, contentType: 'image/png' });
  } finally { await context.close(); }
});

test('sidebar alignment and course links work without JavaScript', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 960 }, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/zh/courses/llm-101/what-a-language-model-does');
    const title = page.locator('[data-slot="sidebar-header"] a');
    const left = (await textBounds(title)).left;
    expect((await textBounds(title)).left).toBeCloseTo(left, 1);
    expect((await page.locator('[data-sidebar="menu-button"] > span').first().boundingBox())!.x).toBeCloseTo(left, 1);
    expect((await page.locator('[data-sidebar="menu-sub-button"] > span').first().boundingBox())!.x).toBeCloseTo(left, 1);
    const path = testInfo.outputPath('sidebar-no-js.png');
    await page.screenshot({ path, animations: 'disabled' });
    await testInfo.attach('Sidebar without JavaScript', { path, contentType: 'image/png' });
    await title.click();
    await expect(page).toHaveURL('/zh/courses/llm-101');
  } finally { await context.close(); }
});
