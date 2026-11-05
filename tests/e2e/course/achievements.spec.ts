import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readCatalog } from '../../../src/lib/content/manifest';
import { globalAchievementCourses } from '../../../src/lib/content/model';

const catalog = readCatalog();
const course = catalog.courses.find((item) => item.locale === 'zh' && item.id === 'llm-101')!;
const firstLesson = course.lessons[0];
const firstAchievement = course.achievements[0];
const firstDefinition = catalog.documents.find((doc) => doc.url === firstLesson.url)!.achievements[0];
const globalCourses = globalAchievementCourses(catalog, 'zh');
const total = globalCourses.reduce((count, item) => count + item.achievements.length, 0);

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published achievement inventory.');

async function verifyGallerySurface(page: Page) {
  const dialog = page.getByRole('dialog', { name: '我的成就' });
  await expect(dialog).toHaveCSS('border-color', 'rgb(49, 86, 75)');
  await expect(dialog.getByRole('heading')).toHaveCSS('color', 'rgb(49, 86, 75)');
  await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toHaveCSS('color', 'rgb(49, 86, 75)');
  await expect(dialog.getByRole('progressbar').locator('div')).toHaveCSS('background-color', 'rgb(49, 86, 75)');
  const overlay = page.locator('[data-slot="dialog-overlay"]');
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveCSS('background-color', /[,/]\s*0\.6\)$/);
  const blur = await overlay.evaluate(element => {
    const style = getComputedStyle(element);
    return style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter');
  });
  expect(blur).toBe('blur(8px)');
}

test('earned medals, four-column alignment, hover, and lesson navigation', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(firstLesson.url);
  await page.locator(`[data-achievement="${firstAchievement.id}"]`).getByRole('radio')
    .nth(firstDefinition.options.findIndex((option) => option.value === firstDefinition.answer)).click();
  const trigger = page.getByRole('button', { name: '我的成就', exact: true });
  await expect(trigger.locator('svg')).toHaveCount(0);
  const entryPadding = await trigger.evaluate((element) => {
    const button = element.getBoundingClientRect();
    const ring = element.querySelector('[role="progressbar"]')!.getBoundingClientRect();
    return { left: ring.left - button.left, top: ring.top - button.top, bottom: button.bottom - ring.bottom };
  });
  expect(entryPadding.left).toBeGreaterThanOrEqual(8);
  expect(entryPadding.top).toBe(8);
  expect(entryPadding.bottom).toBe(8);
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '我的成就' });
  await expect(dialog).toBeVisible();
  await verifyGallerySurface(page);
  await expect.poll(async () => Number(await dialog.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeCloseTo(100 / total, 8);
  const medals = dialog.locator('[data-medal]');
  await expect(medals).toHaveCount(total);
  await expect(medals.first()).toHaveAttribute('data-earned', 'true');
  await expect(medals.nth(1)).toHaveAttribute('data-earned', 'false');
  await expect(medals.first().locator('[data-medal-emblem]')).toHaveCSS('color', 'rgb(49, 86, 75)');
  await expect(medals.first().locator('[data-medal-emblem]')).toHaveCSS('border-color', 'rgb(49, 86, 75)');

  const layout = await dialog.evaluate((element) => {
    const progress = element.querySelector('[role="progressbar"]')!.getBoundingClientRect();
    const emblems = [...element.querySelectorAll('[data-medal-emblem]')].map((item) => {
      const { x, y, width, height } = item.getBoundingClientRect();
      return { x, y, width, height };
    });
    return { progressX: progress.x, emblems, dialogWidth: element.getBoundingClientRect().width };
  });
  expect(layout.dialogWidth).toBeGreaterThanOrEqual(720);
  expect(layout.emblems.slice(0, 4).every((item) => Math.abs(item.y - layout.emblems[0].y) < 1)).toBe(true);
  expect(layout.emblems[4].y).toBeGreaterThan(layout.emblems[0].y);
  expect(Math.abs(layout.emblems[0].x - layout.progressX)).toBeLessThanOrEqual(1);
  expect(Math.abs(layout.emblems[4].x - layout.progressX)).toBeLessThanOrEqual(1);
  const link = medals.nth(1).getByRole('link');
  await expect(link).toHaveCSS('opacity', '0');
  const before = await dialog.boundingBox();
  await medals.nth(1).hover();
  await expect(link).toHaveCSS('opacity', '1');
  expect((await dialog.boundingBox())!.height).toBe(before!.height);
  const accessibility = await new AxeBuilder({ page }).include('[data-course-achievements]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  const screenshot = testInfo.outputPath('achievement-gallery-desktop.png');
  await dialog.screenshot({ path: screenshot });
  await testInfo.attach('achievement-gallery-desktop', { path: screenshot, contentType: 'image/png' });
  const backdropScreenshot = testInfo.outputPath('achievement-gallery-frosted-desktop.png');
  await page.screenshot({ path: backdropScreenshot });
  await testInfo.attach('Achievement gallery and frosted backdrop', { path: backdropScreenshot, contentType: 'image/png' });
  await testInfo.attach('achievement-gallery-layout', { body: JSON.stringify(layout, null, 2), contentType: 'application/json' });
  await link.click();
  await expect(page).toHaveURL(/what-is-a-token#achievement-token-boundaries$/);
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#achievement-token-boundaries')).toBeInViewport();
  await page.reload();
  await trigger.click();
  await expect(dialog.locator('[data-medal]').first()).toHaveAttribute('data-earned', 'true');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(trigger).toBeFocused();
  await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
  await trigger.press('Enter');
  await expect(dialog).toBeVisible();
  await page.mouse.click(16, 16);
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('collapsed sidebar keeps an icon-only achievement button in the footer', async ({ page, browserName }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(firstLesson.url);
  const sidebar = page.locator('[data-slot="sidebar-container"]');
  const toggle = sidebar.locator('[data-sidebar="trigger"]');
  const footer = sidebar.locator('[data-sidebar="footer"]');
  const trigger = footer.getByRole('button', { name: '我的成就', exact: true });
  const ring = trigger.getByRole('progressbar');
  await expect(trigger.locator('[data-achievement-count]')).toBeVisible();
  await toggle.click();

  const geometry = [];
  for (const viewport of [{ width: 1440, height: 960 }, { width: 961, height: 600 }]) {
    await page.setViewportSize(viewport);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(footer).toBeInViewport();
    await expect(footer.getByRole('button')).toHaveCount(1);
    await expect(trigger.locator('[data-achievement-count]')).toBeHidden();
    await expect(footer.locator('[data-slot="language-menu-trigger"]')).toBeHidden();
    await expect(footer.locator('[data-slot="author-dialog-trigger"]')).toBeHidden();
    await expect(ring).toHaveAttribute('aria-valuenow', '0');
    const sidebarBounds = (await sidebar.boundingBox())!;
    const footerBounds = (await footer.boundingBox())!;
    const buttonBounds = (await trigger.boundingBox())!;
    const ringBounds = (await ring.boundingBox())!;
    expect(sidebarBounds.width).toBe(48);
    expect(buttonBounds.width).toBe(44);
    expect(buttonBounds.height).toBe(44);
    expect(ringBounds.width).toBe(28);
    expect(ringBounds.height).toBe(28);
    expect(Math.abs(buttonBounds.x + buttonBounds.width / 2 - (sidebarBounds.x + sidebarBounds.width / 2))).toBeLessThanOrEqual(1);
    const frame = (await page.locator('[data-slot="site-window"]').boundingBox())!;
    expect(footerBounds.y + footerBounds.height).toBe(frame.y + frame.height - 1);
    geometry.push({ viewport, sidebar: sidebarBounds, footer: footerBounds, button: buttonBounds, ring: ringBounds });
  }

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.locator(`[data-achievement="${firstAchievement.id}"]`).getByRole('radio')
    .nth(firstDefinition.options.findIndex((option) => option.value === firstDefinition.answer)).click();
  await expect.poll(async () => Number(await ring.getAttribute('aria-valuenow'))).toBeCloseTo(100 / total, 8);
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(async () => Number(await ring.getAttribute('aria-valuenow'))).toBeCloseTo(100 / total, 8);
  await page.locator('[data-slot="lesson-region"]').evaluate(element => element.scrollTo(0, element.scrollHeight));
  await expect(footer).toBeInViewport();
  await toggle.focus();
  // macOS WebKit uses Option+Tab for full keyboard navigation.
  await page.keyboard.press(browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
  await expect(trigger).toBeFocused();
  const accessibility = await new AxeBuilder({ page }).include('[data-slot="sidebar-container"]').analyze();
  expect(accessibility.violations).toEqual([]);
  const screenshot = testInfo.outputPath('collapsed-sidebar-achievements.png');
  await page.screenshot({ path: screenshot, animations: 'disabled' });
  await testInfo.attach('Collapsed sidebar with achievement progress', { path: screenshot, contentType: 'image/png' });
  const railScreenshot = testInfo.outputPath('collapsed-sidebar-rail.png');
  await sidebar.screenshot({ path: railScreenshot, animations: 'disabled' });
  await testInfo.attach('Collapsed sidebar rail', { path: railScreenshot, contentType: 'image/png' });
  await testInfo.attach('Collapsed sidebar geometry', { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: '我的成就' });
  await expect(dialog).toBeVisible();
  await expect.poll(async () => Number(await dialog.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeCloseTo(100 / total, 8);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
  const mobileFooter = page.locator('[data-mobile="true"] [data-sidebar="footer"]');
  await expect(mobileFooter.locator('[data-achievement-count]')).toBeVisible();
  await expect(mobileFooter.locator('[data-slot="language-menu-trigger"]')).toHaveCount(0);
  await expect(mobileFooter.getByRole('button')).toHaveCount(1);
  await page.setViewportSize({ width: 1440, height: 960 });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(trigger.locator('[data-achievement-count]')).toBeVisible();
  await expect(footer.locator('[data-slot="language-menu-trigger"]')).toHaveCount(0);
  await expect(page.getByRole('banner').locator('[data-slot="author-dialog-trigger"]')).toBeVisible();
});

for (const width of [320, 390]) {
  test(`mobile ${width}: two columns, touch links, and sidebar dismissal`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true, baseURL: testInfo.project.use.baseURL });
    const page = await context.newPage();
    await page.goto(firstLesson.url);
    await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
    await page.getByRole('button', { name: '我的成就', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '我的成就' });
    await verifyGallerySurface(page);
    const medals = dialog.locator('[data-medal]');
    await expect(medals).toHaveCount(total);
    await expect(medals.first().getByRole('link')).toHaveCSS('opacity', '1');
    const layout = await dialog.evaluate((element) => {
      const emblems = [...element.querySelectorAll('[data-medal-emblem]')].map((item) => ({ x: item.getBoundingClientRect().x, y: item.getBoundingClientRect().y }));
      const box = element.getBoundingClientRect();
      return { emblems, left: box.left, right: box.right, viewport: innerWidth, overflow: element.scrollWidth > element.clientWidth };
    });
    expect(layout.emblems[0].y).toBe(layout.emblems[1].y);
    expect(layout.emblems[2].y).toBeGreaterThan(layout.emblems[0].y);
    expect(layout.left).toBeGreaterThanOrEqual(0);
    expect(layout.right).toBeLessThanOrEqual(width);
    expect(layout.overflow).toBe(false);
    await testInfo.attach(`achievement-gallery-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    if (width === 390) {
      await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
      const enlarged = await medals.evaluateAll(elements => elements.map(element => {
        const emblem = element.querySelector('[data-medal-emblem]')!.getBoundingClientRect();
        const label = element.querySelector('[data-medal-emblem] + span')!.getBoundingClientRect();
        return { x: emblem.x, bottom: emblem.bottom, labelTop: label.top, overflow: element.scrollWidth > element.clientWidth };
      }));
      expect(enlarged.every(item => item.x === enlarged[0].x && item.bottom <= item.labelTop && !item.overflow)).toBe(true);
      await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeInViewport();
      await testInfo.attach('achievement-gallery-enlarged', { body: await dialog.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
      await page.evaluate(() => { document.documentElement.style.fontSize = '16px'; });
    }
    await medals.nth(1).getByRole('link').click();
    await expect(page).toHaveURL(/what-is-a-token#achievement-token-boundaries$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
    await context.close();
  });
}

test('translations use original exercises when the translated exercise is missing', async ({ page, browserName }) => {
  const english = catalog.courses.find((item) => item.locale === 'en' && item.id === course.id)!;
  await page.goto(english.lessons[0].url);
  await page.getByRole('button', { name: 'My achievements', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'My achievements' });
  await expect(dialog.locator('[data-medal]')).toHaveCount(total);
  await expect(dialog.locator('[data-medal]').first()).toContainText(firstDefinition.title);
  await expect(dialog.locator('[data-medal]').first().getByRole('link')).toHaveAttribute('href', `${firstLesson.url}#achievement-${firstAchievement.id}`);
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  // macOS WebKit uses Option+Tab to include links in keyboard navigation.
  await page.keyboard.press(browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
  await expect(dialog.locator('[data-medal]').first().getByRole('link')).toBeFocused();
  await expect(dialog.locator('[data-medal]').first().getByRole('link')).toHaveCSS('opacity', '1');
});

test('blocked storage keeps the gallery usable without inventing progress', async ({ page }, testInfo) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  await page.goto(firstLesson.url);
  await page.getByRole('button', { name: '我的成就', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '我的成就' });
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(dialog.locator('[data-earned="true"]')).toHaveCount(0);
  await expect(dialog.locator('[data-medal]')).toHaveCount(total);
  await testInfo.attach('achievement-gallery-blocked-storage', { body: await dialog.screenshot(), contentType: 'image/png' });
});
