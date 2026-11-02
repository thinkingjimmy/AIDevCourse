import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const course = '/zh/courses/llm-101';
const lesson = `${course}/what-can-you-do-with-ai-chat`;
const previous = `${course}/what-is-a-tool`;
const title = '你可以用 AI Chat 做什么？';
const achievementId = 'use-chat-with-source-material';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published chat uses lesson.');

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`chat uses lesson follows tools and retains its achievement on ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(course);
    const entry = page.locator('section[aria-labelledby="course-catalog"]').getByRole('link', { name: title });
    await expect(entry).toHaveAttribute('href', lesson);
    await expect(entry.locator('> span:first-child')).toHaveText('3.3');
    await page.goto(previous);
    await page.locator('article nav').getByRole('link', { name: /下一课/ }).click();
    await expect(page).toHaveURL(lesson);
    await expect(page.locator('article h1')).toHaveText(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${lesson}$`));
    await expect(page.locator('article nav').getByRole('link', { name: /上一课/ })).toHaveAttribute('href', previous);
    const examples = page.locator('article [data-component="chat"]');
    await expect(examples).toHaveCount(5);
    await expect(examples.nth(1).locator('[data-from="user"]')).toHaveCount(2);
    if (viewport.width < 961) await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
    const sidebar = page.locator(viewport.width < 961 ? '[data-mobile="true"]' : '[data-slot="sidebar-inner"]');
    await expect(sidebar.locator('a[aria-current="page"]')).toContainText(`3.3 ${title}`);
    if (viewport.width < 961) await page.keyboard.press('Escape');
    const challenge = page.locator(`[data-achievement="${achievementId}"]`);
    await expect(challenge).toHaveAttribute('data-state', 'locked');
    await challenge.getByRole('radio').first().click();
    await expect(challenge).toHaveAttribute('data-state', 'incorrect');
    await challenge.getByRole('radio').nth(1).click();
    await expect(challenge).toHaveAttribute('data-state', 'unlocked');
    await page.reload();
    await expect(challenge).toHaveAttribute('data-state', 'unlocked');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await testInfo.attach(`chat-uses-${viewport.name}`, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
    await testInfo.attach(`chat-uses-example-${viewport.name}`, { body: await examples.nth(1).screenshot(), contentType: 'image/png' });
  });
}

test('chat uses lesson is available through search', async ({ page }, testInfo) => {
  await page.goto('/zh');
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: '搜索课时' }).fill('AI Chat');
  const result = page.locator(`.search-result[href="${lesson}"]`).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(lesson);
  await expect(page.locator('article h1')).toHaveText(title);
  await testInfo.attach('chat-uses-search', { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
});

test('chat uses lesson remains readable on a narrow screen without JavaScript', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 844 }, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    expect((await page.goto(lesson))?.status()).toBe(200);
    await expect(page.locator('article h1')).toHaveText(title);
    await expect(page.locator('article [data-component="chat"]')).toHaveCount(5);
    await expect(page.locator('article table tbody tr')).toHaveCount(3);
    await expect(page.locator(`[data-achievement="${achievementId}"] input[type="radio"]`).first()).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach('chat-uses-narrow-no-js', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  } finally { await context.close(); }
});
