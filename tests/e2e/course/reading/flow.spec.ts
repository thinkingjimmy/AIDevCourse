import { test, expect } from '@playwright/test';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published course reading layout.');

for (const scenario of [
  { name: 'desktop', width: 1440, javaScriptEnabled: true, catalog: false },
  { name: 'phone', width: 390, javaScriptEnabled: true, catalog: true },
  { name: 'narrow phone', width: 320, javaScriptEnabled: true, catalog: false },
  { name: 'desktop without JavaScript', width: 1440, javaScriptEnabled: false, catalog: true },
  { name: 'phone without JavaScript', width: 390, javaScriptEnabled: false, catalog: true },
]) {
  test(`course reading scrolls inside the frame on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 960 },
      javaScriptEnabled: scenario.javaScriptEnabled, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const evidence = [];
      const capture = async (name: string) => {
        const path = testInfo.outputPath(`${name}.png`);
        await page.screenshot({ path, animations: 'disabled' });
        await testInfo.attach(name, { path, contentType: 'image/png' });
      };
      await page.goto('/zh/courses/llm-101');
      const start = page.getByRole('link', { name: '开始第一课', exact: true });
      const lessons = page.locator('section[aria-labelledby="course-catalog"] a');
      await expect(start).not.toHaveAttribute('target', '_blank');
      expect(await lessons.evaluateAll(links => links.every(link => link.getAttribute('target') !== '_blank'))).toBe(true);
      const entry = scenario.catalog ? lessons.first() : start;
      const destination = (await entry.getAttribute('href'))!;
      await entry.click();
      await expect(page).toHaveURL(destination);
      expect(context.pages()).toHaveLength(1);
      const header = page.getByRole('banner');
      await expect(header).toHaveCount(1);
      await expect(header).toBeVisible();
      await expect(header).toHaveCSS('position', 'static');
      await expect(header).toHaveCSS('border-bottom-width', '1px');
      await expect(header.locator('.site-header-inner > a')).toHaveCount(1);
      await expect(header.locator('.site-header-logo [data-slot="brand-mark"]')).toBeVisible();
      await expect(header.locator('.language-picker summary')).toBeVisible();
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('article h1')).toBeVisible();
      await expect(page.locator('[data-slot="sidebar-footer"] [data-slot="language-menu-trigger"], [data-slot="sidebar-footer"] .language-picker')).toHaveCount(0);
      const background = await page.locator('[data-slot="sidebar-inset"]').evaluate(element => getComputedStyle(element).backgroundColor);
      const sidebar = page.locator('[data-slot="sidebar-container"]');
      const frame = page.locator('[data-slot="site-window"]');
      const pane = page.locator('[data-slot="lesson-region"]');
      const frameBox = (await frame.boundingBox())!;
      const headerBox = (await header.boundingBox())!;
      const paneBox = (await pane.boundingBox())!;
      const margin = scenario.width <= 721 ? 6 : 12;
      expect(frameBox).toEqual({ x: margin, y: margin, width: scenario.width - 2 * margin, height: 960 - 2 * margin });
      expect(paneBox.y + paneBox.height).toBe(frameBox.y + frameBox.height - 1);
      if (scenario.width >= 961) await expect(sidebar).toBeInViewport();
      const sidebarBox = scenario.width >= 961 ? (await sidebar.boundingBox())! : null;
      if (sidebarBox) {
        await expect(sidebar.locator('img')).toHaveCount(0);
        const title = sidebar.getByRole('link', { name: 'LLM 101', exact: true });
        await expect(title).toHaveCount(1);
        const titleBox = (await title.boundingBox())!;
        const toggleBox = (await sidebar.locator('[data-sidebar="trigger"]').boundingBox())!;
        expect(toggleBox.x).toBeGreaterThanOrEqual(titleBox.x + titleBox.width);
        expect(toggleBox.y + toggleBox.height / 2).toBeCloseTo(titleBox.y + titleBox.height / 2, 1);
        evidence.push({ courseTitle: titleBox, toggle: toggleBox });
        await expect(sidebar).toHaveCSS('background-color', background);
        const sidebarColor = await sidebar.evaluate(element => {
          const probe = document.createElement('div');
          probe.style.backgroundColor = 'var(--color-sidebar)';
          element.append(probe);
          const color = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return color;
        });
        await expect(page.locator('[data-slot="sidebar-inner"]')).toHaveCSS('background-color', sidebarColor);
        expect((await sidebar.boundingBox())!.y).toBeGreaterThanOrEqual((await header.boundingBox())!.height - 1);
        const outline = (await page.locator('[data-slot="lesson-aside"]').boundingBox())!;
        expect(sidebarBox.y).toBe(paneBox.y);
        expect(outline.x).toBeGreaterThanOrEqual(sidebarBox.x + sidebarBox.width + 8);
        expect(outline.x + outline.width).toBeLessThanOrEqual((await page.locator('article').boundingBox())!.x);
      }
      await capture('reading-top');
      await page.mouse.move(paneBox.x + paneBox.width / 2, paneBox.y + 40);
      await page.mouse.wheel(0, 520);
      await expect.poll(() => pane.evaluate(element => element.scrollTop)).toBeGreaterThan(200);
      await expect(page.locator('article h1')).not.toBeInViewport();
      expect(await frame.boundingBox()).toEqual(frameBox);
      expect(await header.boundingBox()).toEqual(headerBox);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      if (sidebarBox) {
        expect(await sidebar.boundingBox()).toEqual(sidebarBox);
        const footer = (await sidebar.locator('[data-slot="sidebar-footer"]').boundingBox())!;
        expect(footer.y + footer.height).toBe(frameBox.y + frameBox.height - 1);
        evidence.push({ sidebar: sidebarBox, footer });
      }
      evidence.push({ frame: frameBox, header: headerBox, pane: paneBox, scrollTop: await pane.evaluate(element => element.scrollTop) });
      await capture('reading-scrolled');
      await expect(header).toBeInViewport();
      if (scenario.javaScriptEnabled) {
        await expect(page.getByRole('button', { name: '我的成就', exact: true }).filter({ visible: true })).toBeEnabled({ timeout: 15000 });
        const language = header.locator('.language-picker summary');
        await language.focus();
        await page.keyboard.press('Control+k');
        await expect(page.getByRole('dialog')).toHaveCount(1);
        await expect(page.getByRole('textbox')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(language).toBeFocused();
        if (scenario.width < 961) {
          const trigger = page.locator('[data-slot="mobile-sidebar-trigger"]');
          await trigger.click();
          const sheet = page.getByRole('dialog', { name: '课程目录', exact: true });
          await expect(sheet).toBeVisible();
          await expect(sheet.getByRole('link', { name: 'LLM 101', exact: true })).toHaveCount(1);
          await expect(sheet.locator('img')).toHaveCount(0);
          await expect(sheet).toHaveCSS('background-color', background);
          await expect(sheet.locator('[data-slot="language-menu-trigger"], .language-picker')).toHaveCount(0);
          await capture('reading-contents');
          await page.keyboard.press('Escape');
          await expect(trigger).toBeFocused();
        } else {
          const toggle = sidebar.locator('[data-sidebar="trigger"]');
          await toggle.click();
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          await expect(toggle).toBeInViewport();
          await expect.poll(async () => (await sidebar.boundingBox())!.width).toBe(48);
          await toggle.click();
          await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        }
      } else if (scenario.width < 961) {
        await page.locator('[data-slot="mobile-native-menu"] > summary').click();
        const panel = page.locator('[data-slot="mobile-native-panel"]');
        await expect(panel).toBeVisible();
        await expect(panel).toHaveCSS('background-color', background);
        await expect(panel.locator('.language-picker')).toHaveCount(0);
        await capture('reading-native-contents');
        await page.locator('[data-slot="mobile-native-menu"] > summary').click();
      }
      await header.locator('.language-picker summary').click();
      await expect(header.locator('.language-options a')).toHaveCount(5);
      await header.locator('.language-options a[hreflang="en"]').click();
      await expect(page).toHaveURL(destination.replace('/zh', ''));
      await expect(page.getByRole('banner')).toHaveCSS('position', 'static');
      expect(context.pages()).toHaveLength(1);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach('Reading layout', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    } finally { await context.close(); }
  });
}

test('keyboard reading reaches the lesson end and the next lesson opens at the top', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/zh/courses/llm-101/what-a-language-model-does');
  const pane = page.locator('[data-slot="lesson-region"]');
  const next = pane.locator('[data-slot="lesson-completion"] button');
  await expect(next).toBeEnabled();
  await pane.press('PageDown');
  await expect.poll(() => pane.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await pane.press('End');
  await expect(next).toBeInViewport();
  await testInfo.attach('End of lesson', { body: await page.screenshot(), contentType: 'image/png' });
  await next.click();
  await expect(page).toHaveURL('/zh/courses/llm-101/what-is-a-token');
  await expect(pane.locator('h1')).toBeInViewport();
  expect(await pane.evaluate(element => element.scrollTop)).toBe(0);
});
