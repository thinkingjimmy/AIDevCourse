import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const lesson = '/zh/courses/llm-101/how-language-models-are-trained';
const copy = JSON.parse(readFileSync('src/messages/zh.json', 'utf8'));
test.beforeEach(() => { test.skip(process.env.CONTENT_TEST === '1', 'Uses the published learning shell.'); });

async function capture(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

for (const width of [1440, 320]) {
  test(`generated sidebar numbers stay consistent across module navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(lesson);
    if (width < 961) await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
    const sidebar = page.locator(width < 961 ? '[data-mobile="true"]' : '[data-slot="sidebar-inner"]');
    const courseLink = sidebar.getByRole('link', { name: 'LLM 101', exact: true });
    await expect(courseLink).toHaveAttribute('href', '/zh/courses/llm-101');
    const modules = sidebar.locator('[data-sidebar="menu-button"]');
    await expect(modules).toHaveText(['01 大语言模型的工作原理', '02 模型的训练与能力', '03 AI 应用的工作原理']);
    const links = sidebar.locator('[data-sidebar="menu-sub-button"]');
    await expect(links.locator('> span:first-child')).toHaveText(['2.1', '2.2', '2.3', '2.4', '2.5']);
    await expect(sidebar.locator('a[aria-current="page"]')).toContainText('2.1 模型是如何预训练的？');
    await modules.nth(0).click();
    await modules.nth(2).click();
    await expect(links.locator('> span:first-child')).toHaveText(['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '2.4', '2.5', '3.1', '3.2']);
    const numbers = await links.locator('> span:first-child').evaluateAll((elements) => elements.map((element) => ({
      text: element.textContent?.trim(), width: element.getBoundingClientRect().width, variant: getComputedStyle(element).fontVariantNumeric,
    })));
    expect(new Set(numbers.map((number) => number.width)).size).toBe(1);
    expect(numbers.every((number) => number.variant.includes('tabular-nums'))).toBe(true);
    await capture(page, `sidebar-numbering-${width}`);
    await test.info().attach('Generated lesson numbers', { body: JSON.stringify(numbers, null, 2), contentType: 'application/json' });
    await modules.nth(1).click();
    await expect(links.locator('> span:first-child')).toHaveText(['1.1', '1.2', '1.3', '1.4', '3.1', '3.2']);
    await links.last().click();
    await expect(page).toHaveURL('/zh/courses/llm-101/what-is-a-tool');
    await expect(page.locator('article h1')).toHaveText('Tool 是什么？');
    if (width < 961) await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
    await expect(sidebar.locator('a[aria-current="page"]')).toContainText('3.2 Tool 是什么？');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).include('.course-navigation').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await courseLink.click();
    await expect(page).toHaveURL('/zh/courses/llm-101');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('LLM 101');
  });
}

test('responsive sidebar exposes one compact mobile header at its exact breakpoint', async ({ page }) => {
  const evidence = [];
  for (const width of [320, 390, 640, 903, 960, 961, 962, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(lesson);
    const header = page.locator('[data-slot="mobile-course-header"]');
    const desktop = page.locator('[data-slot="sidebar-container"]');
    if (width < 961) {
      await expect(header).toBeVisible();
      await expect(desktop).toBeHidden();
      const trigger = header.getByRole('button', { name: copy.Ui.menu, exact: true });
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(header.getByRole('link', { name: /^AIDevCourse/ })).toBeVisible();
      await expect(trigger.locator('svg')).toBeVisible();
      await trigger.focus();
      const bounds = (await trigger.boundingBox())!;
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.width).toBeLessThan(160);
      evidence.push({ width, trigger: bounds });
      if ([320, 903, 960].includes(width)) await capture(page, `mobile-course-header-${width}`);
    } else {
      await expect(header).toBeHidden();
      await expect(desktop).toBeVisible();
      await expect(page.locator('[data-mobile="true"]')).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await test.info().attach('Header breakpoint geometry', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('responsive sidebar drawer fits narrow and short screens with a reachable footer', async ({ page }) => {
  const evidence = [];
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 320 }, { width: 640, height: 450 }, { width: 960, height: 600 }]) {
    await page.setViewportSize(viewport);
    await page.goto(lesson);
    const trigger = page.locator('[data-slot="mobile-sidebar-trigger"]');
    await trigger.click();
    const sheet = page.locator('[data-mobile="true"]');
    await expect(sheet).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(await trigger.getAttribute('aria-controls')).toBe(await sheet.getAttribute('id'));
    const bounds = (await sheet.boundingBox())!;
    expect(bounds.width).toBeLessThanOrEqual(viewport.width - 16 + 0.1);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
    const footer = sheet.locator('[data-sidebar="footer"]');
    await expect(footer).toBeInViewport();
    await sheet.locator('[data-sidebar="menu-sub-button"]').last().scrollIntoViewIfNeeded();
    await expect(footer).toBeInViewport();
    await sheet.getByRole('button', { name: copy.Language.label, exact: true }).click();
    await expect(page.locator('.language-options a[hreflang="en"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('button', { name: copy.Language.label, exact: true })).toBeFocused();
    const accessibility = await new AxeBuilder({ page }).include('[data-mobile="true"]').analyze();
    expect(accessibility.violations).toEqual([]);
    await capture(page, `mobile-sidebar-${viewport.width}-${viewport.height}`);
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.locator('[data-slot="sheet-overlay"]').click({ position: { x: viewport.width - 4, y: viewport.height / 2 } });
    await expect(sheet).toHaveCount(0);
    await expect(trigger).toBeFocused();
    evidence.push({ viewport, drawer: bounds });
  }
  await test.info().attach('Drawer viewport geometry', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('responsive sidebar resets mobile state on resize and navigation while preserving desktop collapse', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(lesson);
  const desktopTrigger = page.locator('[data-slot="sidebar-container"] [data-sidebar="trigger"]');
  await desktopTrigger.click();
  await expect(desktopTrigger).toHaveAttribute('aria-expanded', 'false');
  await page.setViewportSize({ width: 960, height: 844 });
  const trigger = page.locator('[data-slot="mobile-sidebar-trigger"]');
  const sheet = page.locator('[data-mobile="true"]');
  await trigger.click();
  await expect(sheet).toBeVisible();
  await page.setViewportSize({ width: 961, height: 844 });
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('[data-slot="sheet-overlay"]')).toHaveCount(0);
  await expect(desktopTrigger).toHaveAttribute('aria-expanded', 'false');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(sheet).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 200));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await trigger.click();
  await sheet.locator('a[aria-current="page"]').click();
  await expect(sheet).toHaveCount(0);
  await trigger.click();
  const nextLesson = sheet.locator('[data-sidebar="menu-sub-button"]:not([aria-current="page"])').first();
  const destination = (await nextLesson.getAttribute('href'))!;
  await nextLesson.click();
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
  await expect(sheet).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${lesson}$`));
  await expect(sheet).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await capture(page, 'mobile-sidebar-closed-after-history');
});

test('responsive sidebar keeps native course navigation without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    for (const width of [320, 903]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(lesson);
      const header = page.locator('[data-slot="mobile-course-header"]');
      const menu = page.locator('[data-slot="mobile-native-menu"]');
      await expect(header).toBeVisible();
      await expect(page.locator('[data-slot="mobile-sidebar-trigger"]')).toBeHidden();
      const before = (await page.locator('article').boundingBox())!.y;
      await header.getByRole('button', { name: copy.Ui.menu, exact: true }).click();
      await expect(menu).toHaveAttribute('open', '');
      await expect(menu.locator('.course-navigation')).toBeVisible();
      await expect(menu.getByRole('link', { name: 'LLM 101', exact: true })).toHaveAttribute('href', '/zh/courses/llm-101');
      await expect(menu.locator('.course-navigation p')).toHaveText(['01 大语言模型的工作原理', '02 模型的训练与能力', '03 AI 应用的工作原理']);
      await expect(menu.locator('[data-sidebar="menu-sub-button"] > span:first-child')).toHaveText(['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '2.4', '2.5', '3.1', '3.2']);
      expect((await page.locator('article').boundingBox())!.y).toBeCloseTo(before, 0);
      await expect(menu.getByRole('link', { name: copy.Author.website, exact: true })).toHaveAttribute('href', 'https://jimmywong.dev');
      const links = menu.locator('.course-navigation a');
      const numberPositions = await menu.evaluate((element) => ({
        module: element.querySelector('.course-navigation p > span:first-child')!.getBoundingClientRect().left,
        lesson: element.querySelector('[data-sidebar="menu-sub-button"] > span:first-child')!.getBoundingClientRect().left,
      }));
      expect(numberPositions.lesson).toBeCloseTo(numberPositions.module, 1);
      const destination = (await links.first().getAttribute('href'))!;
      await capture(page, `mobile-sidebar-no-js-${width}`);
      await links.first().click();
      await expect(page).toHaveURL(new RegExp(`${destination}$`));
      await expect(menu).not.toHaveAttribute('open', '');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.locator('[data-slot="mobile-course-header"]').getByRole('button', { name: copy.Ui.menu, exact: true }).click();
    await page.locator('[data-slot="mobile-native-menu"]').getByRole('link', { name: 'LLM 101', exact: true }).click();
    await expect(page).toHaveURL('/zh/courses/llm-101');
  } finally { await context.close(); }
});

test('responsive sidebar header and drawer fit enlarged text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(lesson);
  await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
  const header = page.locator('[data-slot="mobile-course-header"]');
  const geometry = await header.evaluate(element => {
    const box = element.getBoundingClientRect();
    return [...element.querySelectorAll('a, button')].filter(control => control.getClientRects().length).map(control => {
      const bounds = control.getBoundingClientRect();
      return { left: bounds.left - box.left, right: bounds.right - box.left, width: box.width };
    });
  });
  expect(geometry.every(control => control.left >= 0 && control.right <= control.width)).toBe(true);
  await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
  const sheet = page.locator('[data-mobile="true"]');
  const box = (await sheet.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(300);
  await expect(sheet.getByRole('button', { name: copy.Ui.close, exact: true })).toBeInViewport();
  await expect(sheet.locator('[data-sidebar="footer"]')).toBeInViewport();
  const numberPositions = await sheet.evaluate((element) => ({
    module: element.querySelectorAll('[data-sidebar="menu-button"] > span:first-of-type')[1].getBoundingClientRect().left,
    lesson: element.querySelector('[data-sidebar="menu-sub-button"] > span:first-child')!.getBoundingClientRect().left,
  }));
  expect(numberPositions.lesson).toBeCloseTo(numberPositions.module, 1);
  await capture(page, 'mobile-sidebar-enlarged-text');
});
