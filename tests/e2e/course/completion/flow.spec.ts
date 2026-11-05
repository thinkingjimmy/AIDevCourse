import { test, expect, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readCatalog } from '../../../../src/lib/content/manifest';

test.skip(process.env.CONTENT_TEST === '1', 'Uses published courses and their completion order.');
const course = readCatalog().courses.find((entry) => entry.locale === 'zh' && entry.id === 'llm-101')!;
const [first, second, third] = course.lessons;
const completionKey = (id: string) => `lac:v1:${course.id}:completion:${id}`;
const button = (page: Page, name = '标记为已完成') => page.getByRole('button', { name, exact: true });

async function sidebar(page: Page, mobile = false) {
  if (mobile) await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
  return page.locator(mobile ? '[data-mobile="true"]' : '[data-slot="sidebar-inner"]');
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
  await testInfo.attach(`${name}-records`, {
    body: JSON.stringify(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('lac:v1:')))), null, 2),
    contentType: 'application/json',
  });
}

for (const width of [1440, 390, 320]) {
  test(`explicit completion advances and aligns saved sidebar checks at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(first.url);
    await expect(button(page)).toBeEnabled();
    await expect(page.locator('article > nav')).toHaveCount(0);
    const footer = page.locator('[data-slot="lesson-completion"]');
    await expect(footer.getByRole('button')).toHaveCount(1);
    expect(await footer.evaluate((element) => getComputedStyle(element).borderTopWidth)).toBe('0px');
    expect(await page.evaluate((key) => localStorage.getItem(key), completionKey(first.id))).toBeNull();
    await button(page).scrollIntoViewIfNeeded();
    await capture(page, testInfo, `completion-button-${width}`);
    await button(page).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(second.url);
    await expect(page.locator('article h1')).toBeInViewport();
    const firstRecord = await page.evaluate((key) => localStorage.getItem(key), completionKey(first.id));
    expect(JSON.parse(firstRecord!).completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    await button(page).click();
    await expect(page).toHaveURL(third.url);
    await page.reload();
    const tree = await sidebar(page, width < 961);
    await expect(tree.locator('[data-slot="lesson-completed"]')).toHaveCount(2);
    for (const lesson of [first, second]) {
      await expect(tree.locator(`a[href="${lesson.url}"]`).getByRole('img', { name: '已完成', exact: true })).toBeVisible();
    }
    await expect(tree.locator(`a[href="${third.url}"] [data-slot="lesson-completed"]`)).toHaveCount(0);
    const geometry = await tree.locator('[data-slot="lesson-completed"]').evaluateAll((icons) => icons.map((icon) => {
      const bounds = icon.getBoundingClientRect();
      const row = icon.closest('a')!;
      const rowBounds = row.getBoundingClientRect();
      const titleBounds = row.querySelectorAll('span')[1].getBoundingClientRect();
      return { right: bounds.right, gap: rowBounds.right - bounds.right, titleRight: titleBounds.right, iconLeft: bounds.left };
    }));
    expect(Math.abs(geometry[0].right - geometry[1].right)).toBeLessThan(1);
    for (const item of geometry) {
      expect(item.gap).toBeCloseTo(8, 0);
      expect(item.titleRight).toBeLessThanOrEqual(item.iconLeft);
    }
    await capture(page, testInfo, `completed-sidebar-${width}`);
    await testInfo.attach(`aligned-checks-${width}`, { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await tree.locator(`a[href="${first.url}"]`).click();
    await expect(page).toHaveURL(first.url);
    await expect(button(page, '下一章')).toBeEnabled();
    await expect(button(page)).toHaveCount(0);
    await page.reload();
    await expect(footer.getByRole('button')).toHaveCount(1);
    await expect(button(page, '下一章')).toBeEnabled();
    await testInfo.attach(`completed-next-button-${width}`, { body: await button(page, '下一章').screenshot(), contentType: 'image/png' });
    await button(page, '下一章').click();
    await expect(page).toHaveURL(second.url);
    expect(await page.evaluate((key) => localStorage.getItem(key), completionKey(first.id))).toBe(firstRecord);
    expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes(':achievement:')))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('completion follows module boundaries and returns from the final lesson to its overview', async ({ page }, testInfo) => {
  const boundary = course.lessons.findIndex((lesson, index) => index > 0 && lesson.module !== course.lessons[index - 1].module);
  await page.goto(course.lessons[boundary - 1].url);
  await button(page).click();
  await expect(page).toHaveURL(course.lessons[boundary].url);
  const last = course.lessons.at(-1)!;
  await page.goto(last.url);
  await button(page).click();
  await expect(page).toHaveURL(course.url);
  await expect(page.locator('main h1')).toHaveText(course.title);
  await capture(page, testInfo, 'final-lesson-completed');
  await page.locator(`section[aria-labelledby="course-catalog"] a[href="${last.url}"]`).click();
  await expect(page.locator(`[data-slot="sidebar-inner"] a[href="${last.url}"] [data-slot="lesson-completed"]`)).toBeVisible();
  await button(page, '下一章').click();
  await expect(page).toHaveURL(course.url);
  await page.goto('/zh/courses/getting-started/what-to-learn-in-the-ai-era');
  await button(page).click();
  await expect(page).toHaveURL('/zh/courses/getting-started/what-to-do-when-anxious');
  await expect(page.locator('article h1')).toHaveText('很焦虑怎么办？');
  await button(page).click();
  await expect(page).toHaveURL('/zh/courses/getting-started/about-this-course');
  await expect(page.locator('article h1')).toHaveText('关于这门课');
  await button(page).click();
  await expect(page).toHaveURL('/zh/courses/getting-started');
  await expect(page.locator('main h1')).toHaveText('从想法到作品');
  await capture(page, testInfo, 'introduction-course-completed');
});

test('completion synchronizes tabs and uses the same stable ID across languages', async ({ page, context }, testInfo) => {
  await page.goto(first.url);
  const other = await context.newPage();
  const english = readCatalog().courses.find((entry) => entry.locale === 'en' && entry.id === course.id)!;
  const translated = english.lessons.find((lesson) => lesson.id === first.id)!;
  await other.goto(translated.url);
  await expect(other.locator('[data-slot="lesson-completed"]')).toHaveCount(0);
  await button(page).click();
  await expect(page).toHaveURL(second.url);
  await expect(other.locator(`.course-navigation a[href="${translated.url}"]`).getByRole('img', { name: 'Completed', exact: true })).toBeVisible();
  const saved = await other.evaluate((key) => localStorage.getItem(key), completionKey(first.id));
  await expect(button(other, 'Mark as complete')).toHaveCount(0);
  await button(other, 'Next chapter').click();
  await expect(other).toHaveURL(english.lessons[1]?.url ?? english.url);
  expect(await other.evaluate((key) => localStorage.getItem(key), completionKey(first.id))).toBe(saved);
  await capture(other, testInfo, 'shared-translated-completion');
  await other.evaluate((key) => localStorage.removeItem(key), completionKey(first.id));
  await expect(page.locator(`[data-slot="sidebar-inner"] a[href="${first.url}"] [data-slot="lesson-completed"]`)).toHaveCount(0);
});

for (const failure of ['blocked', 'quota'] as const) {
  test(`${failure} storage keeps completion and navigation working during the visit`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((mode) => {
      if (mode === 'blocked') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
      else Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
    }, failure);
    await page.goto(first.url);
    await button(page).click();
    await expect(page).toHaveURL(second.url);
    const tree = await sidebar(page);
    await expect(tree.locator(`a[href="${first.url}"] [data-slot="lesson-completed"]`)).toBeVisible();
    await tree.locator(`a[href="${first.url}"]`).click();
    await expect(page).toHaveURL(first.url);
    await expect(tree.locator('a[aria-current="page"] [data-slot="lesson-completed"]')).toBeVisible();
    await button(page, '下一章').click();
    await expect(page).toHaveURL(second.url);
    expect(errors).toEqual([]);
    await testInfo.attach(`completion-${failure}`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
  });
}

test('invalid and legacy completion records stay untouched and unknown lessons are ignored', async ({ page }, testInfo) => {
  const damaged = '{"completedAt":"not-a-date"}';
  const key = completionKey(first.id);
  await page.addInitScript(({ key, damaged }) => {
    if (localStorage.getItem('completion-seeded')) return;
    localStorage.setItem('completion-seeded', 'yes');
    localStorage.setItem(key, damaged);
    localStorage.setItem('lac:v1:llm-101:completion:unknown-lesson', JSON.stringify({ completedAt: '2026-10-01T00:00:00Z' }));
    localStorage.setItem('lac:v1:llm-101:lesson:what-a-language-model-does', JSON.stringify({ completed: true, updatedAt: '2026-10-01T00:00:00Z' }));
  }, { key, damaged });
  await page.goto(first.url);
  await expect(button(page)).toBeEnabled();
  await expect(page.locator('[data-slot="lesson-completed"]')).toHaveCount(0);
  await button(page).click();
  await expect(page).toHaveURL(second.url);
  await expect(page.locator('[data-slot="lesson-completed"]')).toHaveCount(1);
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(damaged);
  await page.reload();
  await expect(button(page)).toBeEnabled();
  await expect(page.locator('[data-slot="lesson-completed"]')).toHaveCount(0);
  await capture(page, testInfo, 'preserved-damaged-record');
});

test('native mobile reading remains available without JavaScript or false completion', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(first.url);
    await expect(button(page)).toBeDisabled();
    await expect(page.locator('article > nav')).toHaveCount(0);
    await page.locator('[data-slot="mobile-native-menu"] summary').click();
    await page.locator(`[data-slot="mobile-native-panel"] a[href="${second.url}"]`).click();
    await expect(page).toHaveURL(second.url);
    await expect(page.locator('article h1')).toHaveText(second.title);
    await expect(page.locator('[data-slot="lesson-completed"]')).toHaveCount(0);
    await button(page).scrollIntoViewIfNeeded();
    await testInfo.attach('completion-without-javascript', { body: await page.screenshot(), contentType: 'image/png' });
  } finally { await context.close(); }
});
