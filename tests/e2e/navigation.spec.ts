/**
 * [INPUT]: Public course overviews, isolated fixture lessons, localized labels, and a production server.
 * [OUTPUT]: Brand identity, course hero alignment and shared actions without summary statistics, footer, language menus, sidebar collapse, and keyboard-only search evidence.
 * [POS]: Navigation acceptance suite; screenshots are local artifacts, not baseline assertions.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

const fixture = process.env.CONTENT_TEST === '1';
const courseSlug = fixture ? 'ai-coding' : 'ai-101';
const coursePath = (locale: string) => `/${locale}/courses/${courseSlug}`;
const lessonPath = (locale = 'zh') => `${coursePath(locale)}/first-change`;

const dictionary = (locale: string) => JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));

async function capture(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`brand identity stays consistent on ${viewport.name}`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const checkBrand = async () => {
      const logo = page.getByRole('link', { name: /^AIDevCourse(?: · |$)/ }).first();
      await expect(logo).toBeVisible();
      await expect(logo).toHaveText('AIDevCourse');
      const mark = logo.locator('img');
      await expect(mark).toHaveAttribute('src', '/images/brand/logo.png');
      await expect(mark).toHaveAttribute('alt', '');
      await expect.poll(() => mark.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 128)).toBe(true);
      await expect(page).toHaveTitle(/AIDevCourse/);
      await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    };
    for (const locale of ['zh', 'en', 'ja', 'fr', 'es']) {
      await page.goto(`/${locale}`);
      await checkBrand();
      await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'AIDevCourse');
      await page.goto(`/${locale}/about`);
      await checkBrand();
      await expect(page.locator('main')).toContainText('AIDevCourse');
    }
    await page.goto('/zh');
    await capture(page, `brand-home-${viewport.name}`);
    await page.goto(coursePath('zh'));
    await checkBrand();
    await page.getByRole('link', { name: /^AIDevCourse · / }).click();
    await expect(page).toHaveURL(/\/zh$/);
    for (const path of ['/unknown-brand-page', '/zh/unknown-brand-page', '/design/a']) {
      await page.goto(path);
      await checkBrand();
    }
    const favicon = await request.get('/favicon.svg');
    expect(favicon.ok()).toBe(true);
    expect(await favicon.text()).toContain('data:image/png;base64,');
    expect(await page.evaluate(async () => {
      const image = new Image();
      image.src = '/favicon.svg';
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    })).toEqual([64, 64]);
    const touchIcon = await request.get('/images/brand/apple-touch-icon.png');
    expect(touchIcon.ok()).toBe(true);
    expect(touchIcon.headers()['content-type']).toContain('image/png');
    if (!fixture) return;
    await page.goto(lessonPath());
    if (viewport.name === 'mobile') await page.getByRole('button', { name: dictionary('zh').Ui.menu, exact: true }).click();
    await checkBrand();
    await capture(page, `brand-sidebar-${viewport.name}`);
  });
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`course overview shares home hero styles and the localized footer on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const appearance = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      return { border: style.border, radius: style.borderRadius, background: style.backgroundColor, color: style.color, shadow: style.boxShadow, height: style.height, font: style.font, padding: style.padding };
    };
    for (const locale of ['zh', 'en', 'ja', 'fr', 'es']) {
      const copy = dictionary(locale);
      await page.goto(`/${locale}`);
      const homeAction = await page.getByRole('link', { name: copy.Home.start, exact: true }).evaluate(appearance);
      await page.goto(coursePath(locale));
      await page.evaluate(() => document.fonts.ready);
      const title = page.locator('main h1');
      const hero = title.locator('..');
      const action = page.getByRole('link', { name: copy.Course.startFirst, exact: true });
      expect(await action.evaluate(appearance)).toEqual(homeAction);
      await expect(action.locator('..').locator('p')).toHaveCount(0);
      await expect(action).toHaveAttribute('target', '_blank');
      const logo = (await page.locator('header a').first().boundingBox())!;
      for (const element of [title, hero.locator(':scope > p').first(), hero.locator(':scope > p').last(), action, page.locator('#course-catalog')]) {
        expect((await element.boundingBox())!.x).toBeCloseTo(logo.x, 1);
      }
      if (locale === 'en' || locale === 'zh') await capture(page, `${locale}-course-hero-${viewport.name}`);
      const footer = page.getByRole('contentinfo');
      await expect(footer).toHaveCount(1);
      await expect(footer).toContainText(dictionary(locale).Home.footerLead);
      await expect(footer).toContainText(dictionary(locale).Home.footerMeta);
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await capture(page, `${locale}-course-footer-${viewport.name}`);
    }
    if (!fixture) return;
    await page.goto(lessonPath());
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    if (viewport.name === 'mobile') await page.getByRole('button', { name: dictionary('zh').Ui.menu, exact: true }).click();
    await page.locator('[data-slot="sidebar-header"] a[href="/zh/courses/ai-coding"]').click();
    await expect(page.getByRole('contentinfo')).toContainText(dictionary('zh').Home.footerLead);
  });
}

test('search uses shortcuts without header or sidebar buttons', async ({ page }) => {
  const copy = dictionary('zh');
  for (const path of ['/zh', coursePath('zh'), ...(fixture ? [lessonPath()] : [])]) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: copy.Search.open, exact: true })).toHaveCount(0);
    const language = page.locator('.language-picker summary');
    await language.focus();
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('textbox', { name: copy.Search.open })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(language).toBeFocused();
    await capture(page, path.endsWith('first-change') ? 'sidebar-without-search-entry' : path === '/zh' ? 'header-without-search-entry' : 'course-without-search-entry');
  }
  if (!fixture) return;
  const toggle = page.locator('[data-slot="sidebar-trigger"]');
  await toggle.click();
  await page.keyboard.press('Meta+k');
  await expect(page.getByRole('textbox', { name: copy.Search.open })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(lessonPath());
  await page.getByRole('button', { name: copy.Ui.menu, exact: true }).click();
  const language = page.locator('.language-picker summary');
  await language.focus();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('textbox', { name: copy.Search.open })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(language).toBeFocused();
  await expect(page.locator('[data-mobile="true"]')).toBeVisible();
  await capture(page, 'mobile-sidebar-without-search-entry');
});

async function openLanguages(page: Page, locale: string) {
  const trigger = page.locator('.language-picker summary');
  await expect(trigger).toHaveAccessibleName(dictionary(locale).Language.label);
  await expect(trigger).toHaveText('');
  await expect(trigger.locator('svg')).toHaveAttribute('viewBox', '0 0 256 256');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.locator('.language-options');
  await expect(menu).toBeVisible();
  await expect(menu.locator('a')).toHaveCount(5);
  await expect(menu.locator('a[aria-current="true"]')).toHaveAttribute('hreflang', locale === 'zh' ? 'zh-Hans' : locale);
  const box = await menu.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThan(230);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  return menu.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: style.width, border: style.border, shadow: style.boxShadow, color: style.color, font: style.font };
  });
}

for (const locale of ['zh', 'en', 'ja', 'fr', 'es']) {
  test(`${locale}: navigation shares a compact globe language menu`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const header = await openLanguages(page, locale);
    await capture(page, `${locale}-header-languages`);
    await page.keyboard.press('Escape');
    await expect(page.locator('.language-picker summary')).toBeFocused();
    await expect(page.locator('.language-options')).not.toBeVisible();
    await page.goto(fixture ? lessonPath(locale) : coursePath(locale));
    await page.evaluate(() => document.fonts.ready);
    expect(await openLanguages(page, locale)).toEqual(header);
    await expect(page.locator('svg.lucide')).toHaveCount(0);
    await capture(page, `${locale}-sidebar-languages`);
    await page.locator('main h1, article h1').click();
    await expect(page.locator('.language-options')).not.toBeVisible();
  });
}

test('sidebar collapse preserves focus, reading space, and navigation state', async ({ page }) => {
  test.skip(!fixture, 'Lesson controls use the isolated fixture build.');
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(lessonPath());
  const sidebar = page.locator('[data-slot="sidebar"][data-state]');
  const toggle = page.locator('[data-slot="sidebar-trigger"]');
  const modules = page.locator('[data-sidebar="menu-button"]');
  if (await modules.first().getAttribute('aria-expanded') !== 'true') await modules.first().click();
  await expect(toggle).toHaveAccessibleName(dictionary('zh').Ui.collapseSidebar);
  const logo = await page.locator('[data-slot="sidebar-header"] a').first().boundingBox();
  const button = await toggle.boundingBox();
  expect(button!.x).toBeGreaterThan(logo!.x + logo!.width);
  await toggle.click();
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAccessibleName(dictionary('zh').Ui.expandSidebar);
  await expect(toggle).toBeFocused();
  await expect(page.locator('.course-navigation')).not.toBeVisible();
  await expect(page.locator('.language-picker')).not.toBeVisible();
  await expect.poll(async () => (await page.locator('[data-slot="sidebar-gap"]').boundingBox())!.width).toBe(48);
  await expect(page.locator('article > .prose')).toBeVisible();
  const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(report.violations).toEqual([]);
  await capture(page, 'sidebar-collapsed');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.closest('[data-slot="sidebar-inner"]') === null)).toBe(true);
  await page.keyboard.press('Control+b');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(modules.first()).toHaveAttribute('aria-expanded', 'true');
  await capture(page, 'sidebar-expanded');
  await toggle.click();
  await page.locator('article nav').last().locator('a').last().click();
  await expect(page).not.toHaveURL(/\/first-change$/);
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(page.locator('.course-navigation')).toBeVisible();
  await modules.first().focus();
  await page.keyboard.press('Control+b');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('heading links use Phosphor icons and report successful copying', async ({ page, context, browserName }) => {
  test.skip(!fixture, 'Lesson controls use the isolated fixture build.');
  test.skip(browserName !== 'chromium', 'Native clipboard permission checks use Chromium.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(lessonPath());
  const heading = page.locator('.prose h2[id]').first();
  const button = heading.getByRole('button', { name: dictionary('zh').Ui.copyAnchor });
  await expect(button.locator('svg')).toHaveAttribute('viewBox', '0 0 256 256');
  await button.focus();
  await button.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: dictionary('zh').Ui.copied })).toBeAttached();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const expected = new URL(page.url());
  expected.hash = (await heading.getAttribute('id'))!;
  expect(copied).toBe(expected.href);
  await expect(page.locator('svg.lucide')).toHaveCount(0);
  await capture(page, 'phosphor-heading-link');
});

test('mobile sidebar closes from the logo row and keeps language choices in the viewport', async ({ page }) => {
  test.skip(!fixture, 'Lesson controls use the isolated fixture build.');
  const copy = dictionary('zh');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 960]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(lessonPath());
    const menuButton = page.getByRole('button', { name: copy.Ui.menu, exact: true });
    await menuButton.click();
    const sheet = page.locator('[data-mobile="true"]');
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAccessibleName(copy.Ui.menu);
    await openLanguages(page, 'zh');
    await capture(page, `mobile-languages-${width}`);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: copy.Ui.close, exact: true }).click();
    await expect(sheet).toHaveCount(0);
    await expect(menuButton).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: copy.Ui.menu, exact: true }).click();
  await page.locator('.language-picker summary').click();
  await page.locator('.language-options a[hreflang="en"]').click();
  await expect(page).toHaveURL(/\/en\/courses\/ai-coding\/first-change$/);
  await page.getByRole('button', { name: dictionary('en').Ui.menu, exact: true }).click();
  await page.locator('[data-mobile="true"] a[href="/en/courses/ai-coding/useful-context"]').click();
  await expect(page).toHaveURL(/\/useful-context$/);
  await expect(page.locator('[data-mobile="true"]')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/first-change$/);
  await expect(page.locator('[data-mobile="true"]')).toHaveCount(0);
});

test('navigation remains usable when session storage and clipboard access fail', async ({ page }) => {
  test.skip(!fixture, 'Lesson controls use the isolated fixture build.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) } });
  });
  await page.goto(lessonPath());
  const toggle = page.locator('[data-slot="sidebar-trigger"]');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.locator('article nav').last().locator('a').last().click();
  await expect(page).not.toHaveURL(/\/first-change$/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(page.locator('.course-navigation')).toBeVisible();
  await page.locator('article nav').last().locator('a').first().click();
  await expect(page).toHaveURL(/\/first-change$/);
  await page.getByRole('button', { name: dictionary('zh').Ui.copyAnchor, exact: true }).first().click();
  await expect(page.getByRole('status').filter({ hasText: dictionary('zh').Ui.copyAnchorFailed })).toBeAttached();
  await expect(page.locator('article > .prose')).toBeVisible();
  expect(errors).toEqual([]);
  await capture(page, 'navigation-storage-and-clipboard-failure');
});
