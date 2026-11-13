import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { locales } from '../../../src/lib/i18n/config';
import { localePath } from '../../../src/lib/i18n/routing';
import { vocabularyCategories } from '../../../src/lib/vocabulary/catalog';

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
  test(`lesson resource disks share homepage metadata and navigate on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 960 },
      javaScriptEnabled: scenario.javaScriptEnabled, hasTouch: scenario.width < 961, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/zh');
      await page.waitForLoadState('networkidle');
      const homeDisk = page.locator('[data-dictionary-disk="vocabulary"]');
      await expect(homeDisk).toHaveAccessibleName('设计词典');
      const home = await homeDisk.evaluate(element => ({
        title: element.querySelector('.disk-title')!.textContent,
        description: document.getElementById(element.getAttribute('aria-describedby')!)!.textContent,
        artwork: getComputedStyle(element.querySelector('[data-slot="course-disk"]')!).borderImageSource,
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
      await expect(resources.getByText(/^\d+ 词条$/)).toHaveCount(0);
      expect(home.artwork).toContain('/images/home/disks/amber.svg');
      await expect(disk.locator('[data-slot="course-disk"]')).toHaveCSS('border-image-source', home.artwork);
      await expect(resources.getByRole('listitem')).toHaveCount(3);
      await resources.scrollIntoViewIfNeeded();
      const geometry = await resources.evaluate(element => {
        const frame = element.getBoundingClientRect();
        const cards = Array.from(element.querySelectorAll('a'), link => {
          const { left, right, top } = link.getBoundingClientRect();
          return { left, right, top };
        });
        return { left: frame.left, right: frame.right, cards };
      });
      for (const card of geometry.cards) {
        expect(card.left).toBeGreaterThanOrEqual(geometry.left);
        expect(card.right).toBeLessThanOrEqual(geometry.right);
      }
      if (scenario.width === 320) expect(geometry.cards[1].top).toBe(geometry.cards[0].top);
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

test('configured resources match the homepage card styles and wrap in order', async ({ page }, testInfo) => {
  const evidence = [];
  await page.goto('/zh');
  const homeCourse = page.locator('[data-slot="course-grid"]').getByRole('link', { name: 'LLM 101', exact: true });
  const home = await homeCourse.evaluate(element => ({
    href: element.getAttribute('href')!,
    meta: element.querySelector('.disk-meta')!.textContent!,
    artwork: getComputedStyle(element.querySelector('[data-slot="course-disk"]')!).borderImageSource,
  }));
  expect(home.artwork).toContain('/images/home/disks/forest.svg');
  await page.goto('/design/components#resource-disks');
  const resources = page.locator('#resource-disks [data-component="resource-disks"]');
  const links = resources.getByRole('link');
  const course = links.first();
  await expect(links).toHaveCount(3);
  await expect(course).toHaveAccessibleName('LLM 101');
  await expect(course).toHaveAttribute('href', home.href);
  await expect(course.locator('.disk-meta')).toHaveText(home.meta);
  await expect(course.locator('[data-slot="course-disk"]')).toHaveCSS('border-image-source', home.artwork);
  await expect(links.nth(1)).toHaveAccessibleName('设计词典');
  await expect(links.nth(1)).toHaveAttribute('href', destination);
  await expect(links.nth(2)).toHaveAttribute('href', '/zh/programming-vocabulary/static-website');
  await expect(resources.locator('[data-slot="course-disk"]')).toHaveCount(3);
  await expect(resources.getByText('1 词条', { exact: true })).toHaveCount(0);
  for (const width of [1440, 961, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await resources.scrollIntoViewIfNeeded();
    const geometry = await resources.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const cards = [...element.querySelectorAll(':scope > li > a')].map(item => {
        const { left, right, top, bottom } = item.getBoundingClientRect();
        return { left, right, top, bottom };
      });
      return { left: bounds.left, right: bounds.right, cards };
    });
    const [first, second, third] = geometry.cards;
    const centerY = (card: { top: number; bottom: number }) => (card.top + card.bottom) / 2;
    expect(centerY(second)).toBeCloseTo(centerY(first), 0);
    if (width <= 390) {
      expect(third.top).toBeGreaterThan(Math.max(first.bottom, second.bottom));
    } else {
      expect(centerY(third)).toBeCloseTo(centerY(first), 0);
    }
    for (const card of geometry.cards) {
      expect(card.left).toBeGreaterThanOrEqual(geometry.left);
      expect(card.right).toBeLessThanOrEqual(geometry.right);
    }
    for (let index = 1; index < geometry.cards.length; index++) {
      const current = geometry.cards[index], previous = geometry.cards[index - 1];
      expect(current.top >= previous.bottom || current.left >= previous.right).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach(`Mixed resource cards at ${width}px`, { body: await resources.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    evidence.push({ width, ...geometry });
  }
  await testInfo.attach('Configured resource layout', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  await course.focus();
  await course.press('Enter');
  await expect(page).toHaveURL('/zh/courses/llm-101');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('LLM 101');
});

test('dictionary disks keep localized labels and destinations on the homepage', async ({ page }, testInfo) => {
  const evidence = [];
  const count = vocabularyCategories.reduce((total, category) => total + category.terms.length, 0);
  for (const locale of locales) {
    const copy = JSON.parse(readFileSync(`src/messages/vocabulary/${locale}.json`, 'utf8'));
    const { Home } = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
    await page.context().clearCookies();
    await page.goto(localePath(locale));
    const group = page.getByRole('region', { name: Home.dictionaries, exact: true });
    const disk = group.locator('[data-dictionary-disk="vocabulary"]');
    await expect(disk).toHaveAccessibleName(copy.title);
    await expect(disk).toHaveAccessibleDescription(copy.description);
    await expect(disk).toHaveAttribute('href', localePath(locale, '/vocabulary/typography'));
    await expect(disk.getByText(copy.termCount.replace('{count}', String(count)), { exact: true })).toBeVisible();
    evidence.push({ locale, title: copy.title, url: await disk.getAttribute('href') });
    if (locale !== 'zh') {
      await page.goto(`${localePath(locale)}?view=resources`);
      await expect(page.getByText(Home.emptyResources, { exact: true })).toBeVisible();
      await expect(group).toBeHidden();
    }
  }
  await testInfo.attach('Localized dictionary catalog', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});
