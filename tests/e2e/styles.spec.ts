import type { Locale } from '../../src/lib/i18n/config';
import { localePath } from '../../src/lib/i18n/routing';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const fixture = process.env.CONTENT_TEST === '1';
const courseSlug = fixture ? 'ai-coding' : 'llm-101';
const lessonPath = (locale = 'zh', slug = 'first-change') => localePath(locale as Locale, `/courses/${courseSlug}/${slug}`);

const languages = ['zh', 'en', 'ja', 'fr', 'es'] as const;
const viewports = [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }];
const dictionary = (locale: string) => JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));

test.describe('Homepage primary action', () => {
  async function captureAction(page: Page, name: string) {
    const path = test.info().outputPath(`${name}.png`);
    await page.screenshot({ path, animations: 'disabled' });
    await test.info().attach(name, { path, contentType: 'image/png' });
  }

  test('homepage primary action moves only the arrow on hover and keeps a stable hit area', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/zh');
    await page.evaluate(() => document.fonts.ready);
    const action = page.locator('[data-slot="home-primary-action"]');
    const face = action.locator('[data-slot="home-primary-face"]');
    const arrow = action.locator('[data-slot="home-primary-arrow"]');
    const destination = (await action.getAttribute('href'))!;
    await expect(action).toHaveAccessibleName(dictionary('zh').Home.start);
    await expect(face).toHaveCSS('background-color', 'rgb(9, 9, 11)');
    await expect(face).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(face).toHaveCSS('border-radius', '3px');
    const hitArea = (await action.boundingBox())!;
    const restingFace = (await face.boundingBox())!;
    const restingArrow = (await arrow.boundingBox())!;
    expect(hitArea.height).toBeGreaterThanOrEqual(44);
    await action.focus();
    await expect(action).toBeFocused();
    await expect(action).toHaveCSS('outline-style', 'solid');
    await expect(face).toHaveCSS('translate', 'none');
    await captureAction(page, 'home-action-focus');
    await action.blur();
    await action.hover();
    await expect.poll(async () => (await arrow.boundingBox())!.x - restingArrow.x).toBeCloseTo(4, 1);
    expect(await face.boundingBox()).toEqual(restingFace);
    expect(await action.boundingBox()).toEqual(hitArea);
    await captureAction(page, 'home-action-hover');
    await page.mouse.down();
    try {
      await expect.poll(() => face.evaluate(element => parseFloat(getComputedStyle(element).scale))).toBeCloseTo(0.96, 2);
      expect(await action.boundingBox()).toEqual(hitArea);
      await captureAction(page, 'home-action-pressed');
    } finally {
      await page.mouse.move(0, 0);
      await page.mouse.up();
    }
    await expect.poll(async () => (await face.boundingBox())!.y).toBeCloseTo(restingFace.y, 1);
    await captureAction(page, 'home-action-resting');
    await test.info().attach('Stable action geometry', { body: JSON.stringify({ hitArea, restingFace, restingArrow }, null, 2), contentType: 'application/json' });
    await action.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new URL(destination, page.url()).href);
  });

  test('homepage primary action respects touch and reduced motion', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true });
    try {
      const page = await context.newPage();
      await page.goto('/zh');
      const action = page.locator('[data-slot="home-primary-action"]');
      const face = action.locator('[data-slot="home-primary-face"]');
      const arrow = action.locator('[data-slot="home-primary-arrow"]');
      expect(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(false);
      await action.hover();
      await expect(face).toHaveCSS('translate', 'none');
      await expect(arrow).toHaveCSS('translate', 'none');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.mouse.down();
      try {
        await expect(face).toHaveCSS('scale', 'none');
        await expect(face).toHaveCSS('translate', 'none');
        await expect(arrow).toHaveCSS('translate', 'none');
        expect(parseFloat(await face.evaluate(element => getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.00001);
      } finally {
        await page.mouse.move(0, 0);
        await page.mouse.up();
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
      expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await captureAction(page, 'home-action-touch-enlarged');
    } finally { await context.close(); }
  });

  test('homepage primary action keeps native navigation without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      await page.goto('/zh');
      const action = page.getByRole('link', { name: dictionary('zh').Home.start, exact: true });
      const destination = (await action.getAttribute('href'))!;
      await expect(action).toBeVisible();
      await captureAction(page, 'home-action-no-js');
      await action.click();
      await expect(page).toHaveURL(new URL(destination, page.url()).href);
    } finally { await context.close(); }
  });
});

test.setTimeout(90000);
test.beforeEach(({ browserName }, testInfo) => {
  test.skip(fixture && testInfo.title.startsWith('appearance:'), 'Local references cover public pages.');
  test.skip(!fixture && ['shared controls', 'reading stays', 'storage and clipboard'].some((title) => testInfo.title.startsWith(title)), 'Lesson controls use the isolated fixture build.');
  test.skip(testInfo.title.startsWith('appearance:') && browserName !== 'chromium', 'Visual references target Chromium; interaction tests run in every browser.');
});

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('h1')).toHaveCount(1);
}

async function verifyAppearance(page: Page, name: string[], fullPage = true) {
  await expect(page).toHaveScreenshot(name, { fullPage, maxDiffPixelRatio: 0.001, animations: 'disabled' });
  const path = test.info().outputPath(...name);
  await page.screenshot({ path, fullPage, animations: 'disabled' });
  await test.info().attach(name.join('/'), { path, contentType: 'image/png' });
}

for (const locale of languages) {
  for (const viewport of viewports) {
    test(`appearance: ${locale} ${viewport.name}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize(viewport);
      for (const [surface, path] of Object.entries({
        home: localePath(locale as Locale, `/`), about: localePath(locale as Locale, `/about`), course: localePath(locale as Locale, `/courses/llm-101`),
        missing: localePath(locale as Locale, `/missing-style-check`),
      })) {
        await page.goto(path);
        await settle(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${surface} overflows`).toBe(true);
        await verifyAppearance(page, [locale, surface, `${viewport.name}.png`]);
      }
    });
  }
}

for (const viewport of viewports) {
  test(`appearance: design previews ${viewport.name}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(viewport);
    for (const surface of ['index', 'a', 'b', 'c']) {
      await page.goto(surface === 'index' ? '/design' : `/design/${surface}`);
      await settle(page);
      await verifyAppearance(page, ['design', surface, `${viewport.name}.png`]);
    }
  });
}

test('appearance: search and language choices', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize(viewports[0]);
  await page.goto('/zh');
  await page.locator('.language-picker summary').click();
  await verifyAppearance(page, ['controls', 'languages', 'desktop.png'], false);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  const input = page.getByRole('textbox');
  await input.fill('模型');
  await expect(page.locator('.search-result').first()).toBeVisible();
  await verifyAppearance(page, ['controls', 'search', 'desktop.png'], false);
  await page.keyboard.press('Escape');
});

test('shared controls preserve keyboard search and navigation without completion', async ({ page }) => {
  const copy = dictionary('zh');
  await page.goto('/zh');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Control+k');
  const input = page.getByRole('textbox', { name: copy.Search.open });
  await expect(input).toBeFocused();
  await input.fill('上下文');
  await expect(page.locator('.search-result').first()).toBeVisible();
  await input.dispatchEvent('compositionstart');
  await input.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await input.dispatchEvent('compositionend');
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/zh\/courses\/ai-coding\//);
  await page.goto(lessonPath());
  await expect(page.locator('[data-achievement-count]')).toContainText('已解锁 0 项成就');
  await expect(page.locator('.completion-box')).toHaveCount(0);
  await page.getByRole('button', { name: '更多', exact: true }).click();
  await page.getByRole('menuitem', { name: '修改语言', exact: true }).click();
  await page.locator('.language-options a[hreflang="en"]').click();
  await expect(page).toHaveURL(/\/courses\/ai-coding\/first-change$/);
  await expect(page.locator('[data-achievement-count]')).toContainText('0 achievements unlocked');
  const modules = page.locator('[data-sidebar="menu-button"]');
  if (await modules.first().getAttribute('aria-expanded') !== 'true') await modules.first().click();
  await expect(modules.first()).toHaveAttribute('aria-expanded', 'true');
  await page.locator('[data-sidebar="menu-sub-button"]').first().click();
  await expect(modules.first()).toHaveAttribute('aria-expanded', 'true');
  await page.setViewportSize(viewports[1]);
  const menu = page.getByRole('button', { name: dictionary('en').Ui.menu, exact: true });
  await menu.click();
  await expect(page.locator('[data-mobile="true"] .course-navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-mobile="true"]')).toHaveCount(0);
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-mobile="true"]')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('reading stays usable at responsive boundaries and without JavaScript', async ({ page, browser, baseURL }) => {
  for (const width of [320, 640, 720, 840, 960, 961, 1024, 1100, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(lessonPath());
    await expect(page.locator('article > .prose')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`).toBe(true);
  }
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: viewports[1] });
  const reading = await context.newPage();
  await reading.goto(lessonPath());
  await expect(reading.locator('article > .prose')).toBeVisible();
  await reading.locator('noscript > details > summary').click();
  await expect(reading.locator('noscript .course-navigation')).toBeVisible();
  await context.close();
});

test('storage and clipboard failures keep reading and feedback usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('Denied')) } });
  });
  const copy = dictionary('zh');
  await page.goto(lessonPath());
  await expect(page.locator('.completion-box')).toHaveCount(0);
  await page.getByRole('button', { name: copy.Ui.copy, exact: true }).first().click();
  await expect(page.locator('.copy-error').first()).toContainText(copy.Ui.copyFailed);
  await expect(page.locator('article > .prose')).toBeVisible();
  const path = test.info().outputPath('feedback', 'storage-and-clipboard.png');
  await page.screenshot({ path, fullPage: true });
  await test.info().attach('Storage and clipboard feedback', { path, contentType: 'image/png' });
});

test('hero illustrations preserve their opening, hover, and callout behavior', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/zh');
  const mac = page.locator('[data-anatomy="mac"]');
  const keyboard = mac.locator('[data-asm="kb"]');
  await expect.poll(() => keyboard.getAttribute('transform')).not.toBeNull();
  await mac.hover();
  await expect.poll(() => keyboard.getAttribute('transform')).toBeNull();
  await page.mouse.move(0, 0);
  await expect.poll(() => keyboard.getAttribute('transform')).not.toBeNull();
  await page.goto(`/zh/courses/${courseSlug}`);
  const chip = page.locator('[data-anatomy="chip"]');
  await expect(chip).toHaveAttribute('data-settled', 'true');
  await chip.hover();
  await expect(chip).toHaveAttribute('data-settled', 'false');
  await page.mouse.move(0, 0);
  await expect(chip).toHaveAttribute('data-settled', 'true');
  await expect(chip.locator('.co').first()).toHaveCSS('opacity', '1');
  const path = test.info().outputPath('illustrations', 'opened-chip.png');
  await page.screenshot({ path });
  await test.info().attach('Opened chip with callouts', { path, contentType: 'image/png' });
});

test('the entire course card controls chip hover motion', async ({ browser, baseURL }) => {
  test.skip(fixture, 'The public LLM 101 card owns this interaction.');
  test.setTimeout(30000);
  const context = await browser.newContext({ baseURL, viewport: viewports[0], reducedMotion: 'no-preference', recordVideo: { dir: test.info().outputPath('video') } });
  const page = await context.newPage();
  try {
    await page.goto('/');
    const card = page.locator('[data-slot="course-grid"]').getByRole('link', { name: 'LLM 101', exact: true });
    const chip = card.locator('[data-anatomy="chip"]');
    const fan = chip.locator('[data-asm="fan"]');
    await card.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expect(chip).toHaveAttribute('data-settled', 'true');
    await expect(fan).toHaveAttribute('transform', /translate/);
    await card.getByRole('heading').hover();
    await expect.poll(() => fan.getAttribute('transform')).toBeNull();
    const closed = test.info().outputPath('card-hover-assembled.png');
    await page.screenshot({ path: closed });
    await test.info().attach('Card hover assembles the chip', { path: closed, contentType: 'image/png' });
    await chip.hover();
    await card.locator('p').last().hover();
    for (let cycle = 0; cycle < 2; cycle++) {
      await expect.poll(() => fan.getAttribute('transform')).toBeNull();
      await expect(chip).toHaveAttribute('data-settled', 'true');
      await expect(fan).toHaveAttribute('transform', /translate/);
      expect(await card.evaluate((element) => element.matches(':hover'))).toBe(true);
    }
    await expect(chip).toHaveAttribute('data-settled', 'false');
    await page.mouse.move(0, 0);
    await expect(chip).toHaveAttribute('data-settled', 'true');
    await expect(fan).toHaveAttribute('transform', /translate/);
    await card.getByRole('heading').hover();
    await expect.poll(() => fan.getAttribute('transform')).toBeNull();
    await page.mouse.move(0, 0);
    await expect(chip).toHaveAttribute('data-settled', 'true');
    const opened = test.info().outputPath('card-hover-exploded.png');
    await page.screenshot({ path: opened });
    await test.info().attach('Leaving the card reopens the chip', { path: opened, contentType: 'image/png' });
    await expect(chip.locator('.co')).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const still = await fan.getAttribute('transform');
    await card.getByRole('heading').hover();
    await expect(fan).toHaveAttribute('transform', still!);
    await expect(chip).toHaveAttribute('data-settled', 'true');
    await card.click();
    await expect(page).toHaveURL(/\/courses\/llm-101$/);
  } finally {
    await context.close();
    const path = await page.video()?.path();
    if (path) await test.info().attach('Course card hover motion', { path, contentType: 'video/webm' });
  }
});

test('course chip hover loops and shows callouts after each opening', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: viewports[0], reducedMotion: 'no-preference', recordVideo: { dir: test.info().outputPath('video') } });
  const page = await context.newPage();
  try {
    await page.goto(`/courses/${courseSlug}`);
    const chip = page.locator('[data-anatomy="chip"]');
    const fan = chip.locator('[data-asm="fan"]');
    const callout = chip.locator('.co').first();
    await expect(chip).toHaveAttribute('data-settled', 'true');
    await expect(callout).toHaveCSS('opacity', '1');
    await chip.hover();
    for (let cycle = 0; cycle < 2; cycle++) {
      await expect.poll(() => fan.getAttribute('transform')).toBeNull();
      await expect(callout).toHaveCSS('opacity', '0');
      await expect(chip).toHaveAttribute('data-settled', 'true');
      await expect.poll(() => callout.evaluate((element) => getComputedStyle(element).opacity), { intervals: [50] }).toBe('1');
      expect(await chip.evaluate((element) => element.matches(':hover'))).toBe(true);
    }
    await expect(chip).toHaveAttribute('data-settled', 'false');
    await page.mouse.move(0, 0);
    await expect(chip).toHaveAttribute('data-settled', 'true');
    const changesWhileStill = () => fan.evaluate((element) => new Promise<number>((resolve) => {
      let changes = 0;
      const observer = new MutationObserver(() => changes++);
      observer.observe(element, { attributes: true, attributeFilter: ['transform'] });
      setTimeout(() => { observer.disconnect(); resolve(changes); }, 2000);
    }));
    expect(await changesWhileStill()).toBe(0);
    await chip.hover();
    await expect.poll(() => fan.getAttribute('transform')).toBeNull();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(chip).toHaveAttribute('data-settled', 'true');
    await expect(callout).toHaveCSS('opacity', '1');
    expect(await changesWhileStill()).toBe(0);
    const path = test.info().outputPath('course-chip-hover-loop.png');
    await page.screenshot({ path });
    await test.info().attach('Course chip reopened with callouts', { path, contentType: 'image/png' });
  } finally {
    await context.close();
    const path = await page.video()?.path();
    if (path) await test.info().attach('Course chip hover loop', { path, contentType: 'video/webm' });
  }
});

test('home Mac hover repeats closing and opening until the pointer leaves', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: viewports[0], reducedMotion: 'no-preference', recordVideo: { dir: test.info().outputPath('video') } });
  const page = await context.newPage();
  try {
    await page.goto('/');
    const mac = page.locator('[data-anatomy="mac"]');
    const keyboard = mac.locator('[data-asm="kb"]');
    await expect(mac).toHaveAttribute('data-settled', 'true');
    await mac.hover();
    for (let cycle = 0; cycle < 2; cycle++) {
      await expect.poll(() => keyboard.getAttribute('transform')).toBeNull();
      await expect(mac).toHaveAttribute('data-settled', 'true');
      await expect(keyboard).toHaveAttribute('transform', /translate/);
      expect(await mac.evaluate((element) => element.matches(':hover'))).toBe(true);
    }
    await expect(mac).toHaveAttribute('data-settled', 'false');
    await page.mouse.move(0, 0);
    await expect(mac).toHaveAttribute('data-settled', 'true');
    const changesWhileStill = () => keyboard.evaluate((element) => new Promise<number>((resolve) => {
      let changes = 0;
      const observer = new MutationObserver(() => changes++);
      observer.observe(element, { attributes: true, attributeFilter: ['transform'] });
      setTimeout(() => { observer.disconnect(); resolve(changes); }, 2000);
    }));
    expect(await changesWhileStill()).toBe(0);
    await mac.hover();
    await expect.poll(() => keyboard.getAttribute('transform')).toBeNull();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(mac).toHaveAttribute('data-settled', 'true');
    expect(await changesWhileStill()).toBe(0);
    await page.mouse.move(0, 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await mac.hover();
    await expect.poll(() => keyboard.getAttribute('transform')).toBeNull();
    await expect(mac).toHaveAttribute('data-settled', 'true');
    const path = test.info().outputPath('home-mac-hover-loop.png');
    await page.screenshot({ path });
    await test.info().attach('Mac reopens while still hovered', { path, contentType: 'image/png' });
  } finally {
    await context.close();
    const path = await page.video()?.path();
    if (path) await test.info().attach('Homepage Mac hover loop', { path, contentType: 'video/webm' });
  }
});

for (const viewport of [...viewports, { name: 'narrow', width: 320, height: 844 }]) {
  test(`Tailwind typography stays consistent on ${viewport.name}`, async ({ page }) => {
    test.skip(fixture, 'The typography contract uses published pages.');
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const evidence: Record<string, unknown>[] = [];
    for (const locale of languages) {
      for (const surface of ['home', 'lesson']) {
        const path = surface === 'home' ? localePath(locale) : lessonPath(locale, 'what-a-language-model-does');
        expect((await page.goto(path))?.status()).toBe(200);
        await settle(page);
        await expect(page.locator('body')).toHaveCSS('font-size', '16px');
        await expect(page.locator('h1')).toHaveCSS('font-size', surface === 'lesson' ? '36px' : viewport.width > 1101 ? '56px' : '32px');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
        if (surface === 'lesson') {
          const prose = page.locator('.prose');
          await expect(prose).toHaveCSS('font-size', '16px');
          await expect.poll(() => prose.evaluate((element) => parseFloat(getComputedStyle(element).lineHeight))).toBeCloseTo(['zh', 'ja'].includes(locale) ? 31.2 : 29.6, 2);
          if (locale === 'zh') {
            await expect(prose.locator('h2').first()).toHaveCSS('font-size', '30px');
            await expect(prose.locator('h2').first()).toHaveCSS('font-weight', '600');
          }
        }
        evidence.push(await page.locator('h1').evaluate((element) => {
          const style = getComputedStyle(element);
          return { path: location.pathname, size: style.fontSize, leading: style.lineHeight, weight: style.fontWeight };
        }));
        if (['zh', 'en'].includes(locale)) {
          const path = test.info().outputPath(`typography-${locale}-${surface}-${viewport.name}.png`);
          await page.screenshot({ path, fullPage: true, animations: 'disabled' });
          await test.info().attach(`${locale} ${surface}`, { path, contentType: 'image/png' });
        }
      }
    }
    for (const path of ['/design', '/design/a', '/design/b', '/design/c', '/design/components']) {
      expect((await page.goto(path))?.status()).toBe(200);
      await settle(page);
      await expect(page.locator('body')).toHaveCSS('font-size', '15px');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
    }
    const preview = test.info().outputPath(`typography-preview-${viewport.name}.png`);
    await page.screenshot({ path: preview, fullPage: true, animations: 'disabled' });
    await test.info().attach('Writing preview', { path: preview, contentType: 'image/png' });

    await page.goto(lessonPath('zh', 'what-a-language-model-does'));
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
    await expect(page.locator('.prose')).toHaveCSS('font-size', '20px');
    await expect(page.locator('h1')).toHaveCSS('font-size', '45px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (viewport.width < 961) {
      await page.getByRole('button', { name: dictionary('zh').Ui.menu, exact: true }).click();
      await expect(page.locator('[data-mobile="true"]')).toBeVisible();
    }
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('textbox')).toHaveCSS('font-size', '20px');
    await test.info().attach('Typography metrics', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  });
}

for (const viewport of [...viewports, { name: 'narrow', width: 320, height: 844 }]) {
  test(`shadcn heading hierarchy remains readable on ${viewport.name}`, async ({ page }) => {
    test.skip(fixture, 'Uses the published model selection lesson.');
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(lessonPath('zh', 'how-to-choose-a-language-model'));
    await settle(page);
    const prose = page.locator('.course-prose');
    const h2 = prose.getByRole('heading', { level: 2, name: /Q3：如何评判哪个模型更强/ });
    const h3 = prose.getByRole('heading', { level: 3, name: '先通过公开评测缩小范围' });
    await expect(h2).toHaveCSS('font-size', '30px');
    await expect(h3).toHaveCSS('font-size', '24px');
    await expect(h2).toHaveCSS('font-weight', '600');
    await expect(h3).toHaveCSS('font-weight', '600');
    await expect(h2).toHaveCSS('border-bottom-width', '1px');
    await expect(h3).toHaveCSS('border-bottom-width', '0px');
    await expect(prose).toHaveCSS('font-size', '16px');
    const evidence = [];
    for (const enlarged of [false, true]) {
      if (enlarged) await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
      await expect(h2).toHaveCSS('font-size', enlarged ? '37.5px' : '30px');
      await expect(h3).toHaveCSS('font-size', enlarged ? '30px' : '24px');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const heading of [h2, h3]) {
        const geometry = await heading.evaluate(element => {
          const style = getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          return {
            title: element.querySelector('a')?.textContent,
            size: style.fontSize,
            leading: style.lineHeight,
            margin: style.marginTop,
            fits: [...element.children].every(child => {
              const box = child.getBoundingClientRect();
              return box.left >= bounds.left - 1 && box.right <= bounds.right + 1
                && (child.tagName !== 'A' || child.scrollWidth <= child.clientWidth + 1);
            }),
          };
        });
        expect(geometry.fits).toBe(true);
        evidence.push({ enlarged, ...geometry });
      }
      await h2.evaluate(element => element.scrollIntoView({ block: 'start' }));
      const path = test.info().outputPath(`shadcn-hierarchy-${viewport.name}${enlarged ? '-enlarged' : ''}.png`);
      await page.screenshot({ path, animations: 'disabled' });
      await test.info().attach('Heading hierarchy', { path, contentType: 'image/png' });
    }
    await h3.locator('a').click();
    await expect(h3).toBeInViewport();
    expect(decodeURIComponent(new URL(page.url()).hash)).toBe(`#${await h3.getAttribute('id')}`);
    await test.info().attach('Heading metrics', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  });
}

test('Tailwind reading hides unavailable controls without JavaScript', async ({ browser, baseURL }) => {
  test.skip(fixture, 'Uses the published reading surface.');
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    expect((await page.goto(lessonPath('zh', 'what-a-language-model-does')))?.status()).toBe(200);
    await expect(page.locator('.prose.course-prose')).toBeVisible();
    await expect(page.locator('.prose p').first()).toBeVisible();
    await expect(page.locator('.prose h2 button').first()).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const path = test.info().outputPath('typography-reading-no-js.png');
    await page.screenshot({ path, fullPage: true });
    await test.info().attach('Reading without JavaScript', { path, contentType: 'image/png' });
  } finally { await context.close(); }
});

async function lessonReadingGeometry(page: Page) {
  await expect(page.locator('[data-slot="lesson-reading-group"]')).toBeVisible();
  return page.locator('[data-slot="lesson-region"]').evaluate((element) => {
    const region = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingRight = parseFloat(style.paddingRight);
    const group = element.querySelector('[data-slot="lesson-reading-group"]')!.getBoundingClientRect();
    const article = element.querySelector('article')!.getBoundingClientRect();
    const toc = element.querySelector('[data-slot="lesson-toc"]');
    const tocBox = toc?.getBoundingClientRect();
    const rail = element.querySelector('[data-slot="lesson-rail"]');
    const railBox = rail?.getBoundingClientRect();
    const sidebar = document.querySelector('[data-slot="sidebar-container"]');
    const sidebarBox = sidebar?.getBoundingClientRect();
    return {
      fontSize: parseFloat(getComputedStyle(document.documentElement).fontSize),
      viewportWidth: innerWidth,
      region: { left: region.left, width: region.width, contentWidth: region.width - paddingLeft - paddingRight },
      group: { left: group.left, width: group.width },
      articleWidth: article.width,
      articleLeft: article.left,
      articleRight: article.right,
      centerError: Math.abs((group.left + group.right - region.left - paddingLeft - region.right + paddingRight) / 2),
      tocCount: toc ? 1 : 0,
      tocVisible: !!toc?.getClientRects().length,
      tocRight: tocBox?.right ?? 0,
      tocLeft: tocBox?.left ?? 0,
      railVisible: !!rail?.getClientRects().length,
      railLeft: railBox?.left ?? 0,
      railWidth: railBox?.width ?? 0,
      sidebar: { visible: !!sidebar?.getClientRects().length, left: sidebarBox?.left ?? 0, width: sidebarBox?.width ?? 0 },
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
}

async function verifyLessonReading(page: Page) {
  const geometry = await lessonReadingGeometry(page);
  expect(geometry.centerError).toBeLessThan(1);
  expect(geometry.articleWidth).toBeLessThanOrEqual(42.5 * geometry.fontSize + 1);
  expect(geometry.overflow).toBe(false);
  expect(geometry.tocVisible).toBe(geometry.tocCount > 0 && geometry.viewportWidth >= 961);
  const maximum = 42.5 + (geometry.railVisible ? 23 : 0);
  expect(geometry.group.width).toBeCloseTo(Math.min(geometry.region.contentWidth, maximum * geometry.fontSize), 0);
  if (geometry.tocVisible) {
    expect(geometry.tocRight).toBeLessThanOrEqual(geometry.articleLeft);
    expect(geometry.tocLeft - geometry.sidebar.left - geometry.sidebar.width).toBeCloseTo(0.5 * geometry.fontSize, 0);
  }
  if (geometry.railVisible) {
    expect(geometry.railWidth).toBeCloseTo(21 * geometry.fontSize, 0);
    expect(geometry.railLeft - geometry.articleRight).toBeCloseTo(2 * geometry.fontSize, 0);
  }
  return geometry;
}

async function attachReadingEvidence(page: Page, name: string, geometry: unknown) {
  await test.info().attach(`${name} geometry`, { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

for (const width of [961, 1024, 1100, 1280, 1440, 1920, 2560]) {
  test(`lesson reading layout centers beside the sidebar at ${width}px`, async ({ page }) => {
    test.skip(fixture, 'Uses the published lesson and its TOC.');
    await page.setViewportSize({ width, height: 960 });
    await page.goto(lessonPath('zh', 'what-a-language-model-does'));
    const toggle = page.locator('[data-slot="sidebar-trigger"]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.evaluate(() => document.fonts.ready);
    const expanded = await verifyLessonReading(page);
    expect(expanded.sidebar).toEqual({ visible: true, left: 0, width: 320 });
    expect(expanded.region.left).toBe(320);
    await expect(page.locator('[data-sidebar="footer"]')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: dictionary('zh').Course.achievementsTitle })).toBeVisible();
    await attachReadingEvidence(page, `reading-${width}-expanded`, expanded);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    const collapsed = await verifyLessonReading(page);
    expect(collapsed.sidebar).toEqual({ visible: true, left: 0, width: 48 });
    expect(collapsed.region.left).toBe(48);
    if (width === 1280) {
      expect(expanded.tocVisible).toBe(true);
      expect(collapsed.tocVisible).toBe(true);
      expect(expanded.railVisible).toBe(false);
      expect(collapsed.railVisible).toBe(true);
    }
    await attachReadingEvidence(page, `reading-${width}-collapsed`, collapsed);
    await page.keyboard.press('Control+b');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await verifyLessonReading(page);
  });
}

for (const width of [320, 390, 768, 960]) {
  test(`lesson reading layout reflows with the mobile sidebar at ${width}px`, async ({ page }) => {
    test.skip(fixture, 'Uses the published lesson.');
    await page.setViewportSize({ width, height: 844 });
    await page.goto(lessonPath('zh', 'what-a-language-model-does'));
    const geometry = await verifyLessonReading(page);
    expect(geometry.sidebar.visible).toBe(false);
    expect(geometry.region.left).toBe(0);
    const menu = page.getByRole('button', { name: dictionary('zh').Ui.menu, exact: true });
    await menu.click();
    const sheet = page.locator('[data-mobile="true"]');
    await expect(sheet).toBeVisible();
    const box = (await sheet.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    const languageTrigger = sheet.getByRole('button', { name: dictionary('zh').Language.label, exact: true });
    await languageTrigger.click();
    await expect(page.locator('.language-options a[hreflang="en"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(languageTrigger).toBeFocused();
    await sheet.getByRole('button', { name: dictionary('zh').Ui.close, exact: true }).click();
    await expect(sheet).not.toBeVisible();
    await expect(menu).toBeFocused();
    await verifyLessonReading(page);
    await attachReadingEvidence(page, `reading-mobile-${width}`, geometry);
  });
}

test('lesson reading layout fits localized lessons and enlarged text', async ({ page }) => {
  test.skip(fixture, 'Uses published language routes.');
  await page.setViewportSize({ width: 1920, height: 960 });
  const evidence = [];
  for (const locale of languages) {
    await page.goto(lessonPath(locale, 'what-a-language-model-does'));
    evidence.push({ locale, ...await verifyLessonReading(page) });
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
  await expect(page.locator('.prose')).toHaveCSS('font-size', '20px');
  const enlarged = await verifyLessonReading(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await verifyLessonReading(page);
  await attachReadingEvidence(page, 'reading-enlarged-text', { languages: evidence, enlarged });
});

test('lesson reading layout stays usable without JavaScript', async ({ browser, baseURL }) => {
  test.skip(fixture, 'Uses the published reading surface.');
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    for (const width of [1920, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await page.goto(lessonPath('zh', 'what-a-language-model-does'));
      const geometry = await verifyLessonReading(page);
      await expect(page.locator('article > .prose')).toBeVisible();
      await attachReadingEvidence(page, `reading-no-js-${width}`, geometry);
    }
  } finally { await context.close(); }
});
