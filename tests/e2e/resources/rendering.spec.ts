import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { locales } from '../../../src/lib/i18n/config';
import { localePath } from '../../../src/lib/i18n/routing';

const lesson = '/zh/courses/getting-started/about-this-course';
const destination = '/zh/vocabulary/typography';
test.skip(process.env.CONTENT_TEST === '1', 'Uses the published introduction and dictionary.');

for (const scenario of [
  { name: 'desktop', width: 1440, size: 16, javaScriptEnabled: true },
  { name: 'phone', width: 390, size: 16, javaScriptEnabled: true },
  { name: 'narrow', width: 320, size: 16, javaScriptEnabled: true },
  { name: 'enlarged', width: 390, size: 24, javaScriptEnabled: true },
  { name: 'no-js', width: 390, size: 16, javaScriptEnabled: false },
]) {
  test(`lesson resource disks reuse the homepage and navigate on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 960 },
      javaScriptEnabled: scenario.javaScriptEnabled, hasTouch: scenario.width < 961, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/zh');
      await page.waitForLoadState('networkidle');
      const homeDisk = page.locator('[data-resource-disk="vocabulary"]');
      await expect(homeDisk).toHaveAccessibleName('设计词典');
      const home = await homeDisk.evaluate(element => ({
        artwork: getComputedStyle(element.querySelector('.course-disk')!).borderImageSource,
        title: element.querySelector('.disk-title')!.textContent,
        meta: element.querySelector('.disk-meta')!.textContent,
        description: document.getElementById(element.getAttribute('aria-describedby')!)!.textContent,
      }));
      await page.goto(lesson);
      if (scenario.size !== 16) await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, scenario.size);
      const resources = page.getByRole('list', { name: '学习资源', exact: true });
      const paragraph = page.locator('article p').filter({ hasText: '首先，本课程会分成入门、中级和高级三个阶段' });
      expect(await paragraph.evaluate(element => element.nextElementSibling?.getAttribute('data-component'))).toBe('resource-disks');
      const disk = resources.getByRole('link', { name: '设计词典', exact: true });
      await expect(disk).toHaveAttribute('href', destination);
      await expect(disk).toHaveAccessibleDescription(home.description!);
      await expect(disk.locator('.disk-title')).toHaveText(home.title!);
      await expect(disk.locator('.disk-meta')).toHaveText(home.meta!);
      await expect(disk.locator('.course-disk')).toHaveCSS('border-image-source', home.artwork);
      expect(await resources.getByRole('listitem').count()).toBeGreaterThanOrEqual(1);
      await resources.scrollIntoViewIfNeeded();
      const geometry = await resources.evaluate(element => {
        const frame = element.getBoundingClientRect();
        const disk = element.querySelector('a')!.getBoundingClientRect();
        return { left: disk.left, right: disk.right, containerLeft: frame.left, containerRight: frame.right };
      });
      expect(geometry.left).toBeGreaterThanOrEqual(geometry.containerLeft);
      expect(geometry.right).toBeLessThanOrEqual(geometry.containerRight);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (scenario.javaScriptEnabled) {
        const accessibility = await new AxeBuilder({ page }).include('[data-component="resource-disks"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
      await testInfo.attach('Lesson resource disks', { body: await resources.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
      await testInfo.attach('Shared homepage metadata', { body: JSON.stringify({ home, geometry }, null, 2), contentType: 'application/json' });
      await disk.focus();
      await expect(disk).toBeFocused();
      await disk.press('Enter');
      await expect(page).toHaveURL(destination);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('文字排版');
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}

test('resource disks wrap additional cards inside the article at narrow widths', async ({ page }, testInfo) => {
  const evidence = [];
  for (const width of [1440, 961, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(lesson);
    const resources = page.locator('[data-component="resource-disks"]');
    await page.waitForLoadState('networkidle');
    await expect.poll(() => resources.evaluate(element => Object.keys(element).some(key => key.startsWith('__reactFiber')))).toBe(true);
    await resources.evaluate(element => {
      const item = element.querySelector('[data-resource-disk="vocabulary"]')!.closest('li')!.cloneNode(true);
      element.replaceChildren(item);
      for (let index = 0; index < 4; index++) {
        const clone = item.cloneNode(true) as HTMLElement;
        for (const child of clone.querySelectorAll('[id]')) child.id += `-layout-${index}`;
        for (const attribute of ['aria-labelledby', 'aria-describedby']) {
          const link = clone.querySelector('a')!;
          link.setAttribute(attribute, `${link.getAttribute(attribute)}-layout-${index}`);
        }
        element.append(clone);
      }
    });
    await resources.scrollIntoViewIfNeeded();
    const geometry = await resources.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const cards = [...element.querySelectorAll(':scope > li')].map(item => {
        const { left, right, top, bottom } = item.getBoundingClientRect();
        return { left, right, top, bottom };
      });
      return { left: bounds.left, right: bounds.right, cards };
    });
    expect(geometry.cards).toHaveLength(5);
    expect(new Set(geometry.cards.map(card => card.top)).size).toBeGreaterThan(1);
    for (const card of geometry.cards) {
      expect(card.left).toBeGreaterThanOrEqual(geometry.left);
      expect(card.right).toBeLessThanOrEqual(geometry.right);
    }
    for (let index = 1; index < geometry.cards.length; index++) {
      const current = geometry.cards[index], previous = geometry.cards[index - 1];
      expect(current.top > previous.top || current.left >= previous.right).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach(`Wrapping disks at ${width}px`, { body: await resources.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    evidence.push({ width, ...geometry });
  }
  await testInfo.attach('Additional-card layout', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('the shared homepage resource catalog keeps localized labels and destinations', async ({ page }, testInfo) => {
  const evidence = [];
  for (const locale of locales) {
    const copy = JSON.parse(readFileSync(`src/messages/vocabulary/${locale}.json`, 'utf8'));
    await page.context().clearCookies();
    await page.goto(localePath(locale));
    const disk = page.locator('[data-resource-disk="vocabulary"]');
    await expect(disk).toHaveAccessibleName(copy.title);
    await expect(disk).toHaveAccessibleDescription(copy.description);
    await expect(disk).toHaveAttribute('href', localePath(locale, '/vocabulary/typography'));
    await expect(disk.locator('.disk-level')).toHaveText(copy.tool);
    evidence.push({ locale, title: copy.title, url: await disk.getAttribute('href') });
  }
  await testInfo.attach('Localized resource catalog', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});
