import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { catalog, llm, last, completionKey, rewardKey, celebration, burst, seedCompletions, openGallery, capture, holdConfetti } from './helpers';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published final lessons.');

for (const width of [1440, 320]) {
  test(`first final-lesson completion celebrates once above the dialog at ${width}px`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await seedCompletions(page, llm.id, llm.lessons.slice(0, -1).map((lesson) => lesson.id));
    await page.goto(last.url);
    await holdConfetti(page);
    const complete = page.getByRole('button', { name: '标记为已完成', exact: true });
    await complete.focus();
    await complete.press('Enter');
    const dialog = celebration(page);
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(last.url);
    await expect(dialog.getByRole('heading', { name: '恭喜完成 LLM 101！' })).toBeFocused();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(burst(page)).toHaveCount(1);
    await expect(burst(page)).toHaveCSS('pointer-events', 'none');
    const layers = await page.evaluate(() => [...document.querySelectorAll('[data-course-completion-dialog], [data-achievement-confetti]')].map((node) => Number(getComputedStyle(node).zIndex)));
    expect(Math.max(...layers)).toBe(Number(await burst(page).evaluate((node) => getComputedStyle(node).zIndex)));
    for (const side of ['left', 'right']) await expect(burst(page).locator(`[data-confetti-side="${side}"]`)).toHaveCount(width < 640 ? 80 : 120);
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), rewardKey())).not.toBeNull();
    const saved = await page.evaluate(({ completion, reward }) => [localStorage.getItem(completion), localStorage.getItem(reward)], { completion: completionKey(llm.id, last.id), reward: rewardKey() });
    const links = dialog.getByRole('link');
    await expect(links).toHaveCount(4);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    await expect(dialog.getByRole('link', { name: '在 GitHub 为本项目加 Star' })).toHaveAttribute('href', 'https://github.com/thinkingjimmy/aidevcourse');
    await expect(dialog.getByRole('link', { name: '关注 X', exact: true })).toHaveAttribute('href', 'https://x.com/thinkingjimmy');
    await expect(dialog.getByRole('link', { name: '关注哔哩哔哩' })).toHaveAttribute('href', 'https://space.bilibili.com/1409205119');
    await expect(dialog.getByRole('link', { name: '关注小红书' })).toHaveAttribute('href', 'https://www.xiaohongshu.com/user/profile/6073d38d00000000010068a6');
    await context.route('https://github.com/thinkingjimmy/aidevcourse', (route) => route.fulfill({ contentType: 'text/html', body: '<title>Project destination</title>' }));
    const popup = page.waitForEvent('popup');
    await dialog.getByRole('link', { name: '在 GitHub 为本项目加 Star' }).click();
    const destination = await popup;
    await expect(destination).toHaveURL('https://github.com/thinkingjimmy/aidevcourse');
    await destination.close();
    await expect(dialog).toBeVisible();
    await capture(page, testInfo, `completed-course-celebration-${width}`);
    const accessibility = await new AxeBuilder({ page }).include('[data-course-completion-dialog]').analyze();
    expect(accessibility.violations).toEqual([]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(burst(page)).toHaveCount(0);
    if (width === 320) {
      await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
      const geometry = await dialog.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, overflow: element.scrollWidth > element.clientWidth };
      });
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(width);
      expect(geometry.overflow).toBe(false);
      await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeInViewport();
      await dialog.getByRole('button', { name: '返回课程总览', exact: true }).scrollIntoViewIfNeeded();
      await capture(page, testInfo, 'completed-course-enlarged-text');
      await page.evaluate(() => { document.documentElement.style.fontSize = '16px'; });
    }
    await dialog.getByRole('button', { name: '返回课程总览', exact: true }).click();
    await expect(page).toHaveURL(llm.url);
    await expect(celebration(page)).toHaveCount(0);
    await expect(burst(page)).toHaveCount(0);
    await page.locator(`section[aria-labelledby="course-catalog"] a[href="${last.url}"]`).click();
    await page.getByRole('button', { name: '完成课程', exact: true }).click();
    await expect(page).toHaveURL(llm.url);
    await expect(celebration(page)).toHaveCount(0);
    expect(await page.evaluate(({ completion, reward }) => [localStorage.getItem(completion), localStorage.getItem(reward)], { completion: completionKey(llm.id, last.id), reward: rewardKey() })).toEqual(saved);
  });
}

for (const close of ['button', 'escape', 'overlay', 'overview']) {
  test(`skipping to the last lesson celebrates without a medal and returns via ${close}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(last.url);
    await holdConfetti(page);
    await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
    const dialog = celebration(page);
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('又完成一课，继续加油！');
    await expect(burst(page)).toHaveCount(1);
    expect(await page.evaluate((key) => localStorage.getItem(key), rewardKey())).toBeNull();
    if (close === 'button') await dialog.getByRole('button', { name: '关闭', exact: true }).click();
    else if (close === 'escape') await page.keyboard.press('Escape');
    else if (close === 'overlay') await page.locator('[data-slot="dialog-overlay"]').click({ position: { x: 4, y: 4 } });
    else await dialog.getByRole('button', { name: '返回课程总览', exact: true }).click();
    await expect(page).toHaveURL(llm.url);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(burst(page)).toHaveCount(0);
    await capture(page, testInfo, `skipped-lessons-dismissed-${close}`);
  });
}

for (const locale of ['en', 'ja', 'fr', 'es'] as const) {
  test(`${locale}: final-lesson copy localizes without motion or overflow`, async ({ page }, testInfo) => {
    const course = catalog.courses.find((course) => course.id === llm.id && course.locale === locale)!;
    const messages = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
    await page.setViewportSize({ width: 320, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(course.lessons.at(-1)!.url);
    await page.getByRole('button', { name: messages.Ui.markComplete, exact: true }).click();
    const dialog = celebration(page);
    await expect(dialog).toHaveAccessibleName(messages.Course.completionPartialTitle);
    await expect(dialog).toContainText(messages.Course.completionInvitation);
    await expect(burst(page)).toHaveCount(0);
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await capture(page, testInfo, `completion-dialog-${locale}`);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(course.url);
    await page.locator(`a[href="${course.lessons.at(-1)!.url}"]`).first().click();
    await page.getByRole('button', { name: messages.Ui.finishCourse, exact: true }).click();
    await expect(page).toHaveURL(course.url);
    await expect(celebration(page)).toHaveCount(0);
  });
}

test('blocked storage retains the entire course reward through client navigation', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  await page.goto(llm.lessons[0].url);
  for (const lesson of llm.lessons) {
    await expect(page).toHaveURL(lesson.url);
    await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
  }
  await expect(celebration(page)).toContainText('恭喜完成 LLM 101！');
  await expect(celebration(page)).toContainText('刷新后可能丢失');
  await celebration(page).getByRole('button', { name: '返回课程总览', exact: true }).click();
  await expect(page).toHaveURL(llm.url);
  await page.locator(`a[href="${last.url}"]`).first().click();
  const gallery = await openGallery(page);
  await expect(gallery.locator('[data-medal-course="llm-101"][data-medal="course-completion"]')).toHaveAttribute('data-earned', 'true');
  await capture(page, testInfo, 'completion-memory-fallback');
});

test('quota failure preserves the earned state in memory and keeps the dialog usable', async ({ page }, testInfo) => {
  await seedCompletions(page, llm.id, llm.lessons.slice(0, -1).map((lesson) => lesson.id));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(last.url);
  await expect(page.getByRole('button', { name: '标记为已完成', exact: true })).toBeEnabled();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
  await expect(celebration(page)).toContainText('恭喜完成 LLM 101！');
  await expect(celebration(page)).toContainText('刷新后可能丢失');
  expect(await page.evaluate((key) => localStorage.getItem(key), rewardKey())).toBeNull();
  await capture(page, testInfo, 'completion-quota-fallback');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(llm.url);
});

test('short screens keep every dialog action reachable with enlarged text', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedCompletions(page, llm.id, llm.lessons.slice(0, -1).map((lesson) => lesson.id));
  await page.goto(last.url);
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
  const dialog = celebration(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeInViewport({ ratio: 1 });
  for (const link of await dialog.getByRole('link').all()) {
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeInViewport({ ratio: 1 });
    await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeInViewport({ ratio: 1 });
  }
  await capture(page, testInfo, 'completion-dialog-short-enlarged');
  const overview = dialog.getByRole('button', { name: '返回课程总览', exact: true });
  await overview.scrollIntoViewIfNeeded();
  await expect(overview).toBeInViewport({ ratio: 1 });
  await overview.click();
  await expect(page).toHaveURL(llm.url);
});
