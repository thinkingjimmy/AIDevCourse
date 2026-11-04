import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const course = '/zh/courses/llm-101';
const lesson = `${course}/what-is-a-tool`;
const previous = `${course}/how-ai-chat-works`;
const achievementId = 'tool-request-vs-execution';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published tool calling lesson.');

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`tool lesson follows chat and retains its achievement on ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(course);
    const entry = page.locator('section[aria-labelledby="course-catalog"]').getByRole('link', { name: /Tool 是什么/ });
    await expect(entry).toHaveAttribute('href', lesson);
    await expect(entry.locator('> span:first-child')).toHaveText('3.2');
    await page.goto(previous);
    await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
    await expect(page).toHaveURL(lesson);
    await expect(page.locator('article h1')).toHaveText('Tool 是什么？');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${lesson}$`));
    const call = page.locator('article [data-component="chat-tool-call"]').first();
    await expect(call).toHaveAttribute('data-tool', 'search_web');
    const trigger = call.locator('[data-slot="trace-collapsible-trigger"]');
    await expect(trigger).toContainText('搜索网页');
    await expect(trigger).toHaveAccessibleName('搜索网页 · 已完成');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(call.locator('[data-slot="code-block"]')).toHaveCount(2);
    const [input, result] = (await call.locator('pre').allTextContents()).map((text) => JSON.parse(text));
    expect(input.query).toBe('Guangzhou weather forecast for tomorrow');
    expect(result).toEqual({ forecast: 'Light rain', temperature_range: '23-28 C' });
    const assistant = call.locator('..').locator('..');
    await expect(assistant.locator('[data-slot="message-avatar"]')).toHaveCount(1);
    await expect(assistant.locator('[data-slot="message-response"]')).toHaveText('根据查询到的天气预报，明天广州有小雨，气温约 23 至 28 ℃，出门记得带伞。');
    await testInfo.attach(`tool-call-${viewport.name}`, { body: await assistant.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    await trigger.click();
    await testInfo.attach(`tool-call-collapsed-${viewport.name}-lesson`, { body: await assistant.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    if (viewport.width < 961) await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
    const sidebar = page.locator(viewport.width < 961 ? '[data-mobile="true"]' : '[data-slot="sidebar-inner"]');
    await expect(sidebar.locator('a[aria-current="page"]')).toContainText('3.2 Tool 是什么？');
    if (viewport.width < 961) await page.keyboard.press('Escape');
    const challenge = page.locator(`[data-achievement="${achievementId}"]`);
    await expect(challenge).toContainText('当你问 AI「明天广州的天气如何？」时，它通常如何知道「明天」是哪一天？');
    await testInfo.attach(`tool-time-challenge-${viewport.name}`, { body: await challenge.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    await challenge.getByRole('radio').first().click();
    await expect(challenge).toHaveAttribute('data-state', 'incorrect');
    await expect(challenge).toContainText('产品可以在发给模型的消息中附上当前日期和时区，也可以通过工具获取当前时间。');
    await challenge.getByRole('radio', { name: /产品在消息中提供当前日期和时区/ }).click();
    await expect(challenge).toHaveAttribute('data-state', 'unlocked');
    await expect(challenge).toContainText('理解 AI 的时间来源');
    await page.reload();
    await expect(challenge).toHaveAttribute('data-state', 'unlocked');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await testInfo.attach(`tool-lesson-${viewport.name}`, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
    await testInfo.attach('tool-call-round-trip', { body: JSON.stringify({ input, result }, null, 2), contentType: 'application/json' });
  });
}

test('tool lesson is available through search', async ({ page }, testInfo) => {
  await page.goto('/zh');
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: '搜索课时' }).fill('Tool');
  const result = page.locator(`.search-result[href="${lesson}"]`).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(lesson);
  await testInfo.attach('tool-lesson-search', { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
});

test('tool lesson remains readable on a narrow screen without JavaScript', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 844 }, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    expect((await page.goto(lesson))?.status()).toBe(200);
    await expect(page.locator('article h1')).toHaveText('Tool 是什么？');
    const call = page.locator('article [data-component="chat-tool-call"]').first();
    const fallback = call.locator('details');
    await expect(fallback).toHaveAttribute('open', '');
    await expect(fallback.locator('pre')).toHaveCount(2);
    await expect(fallback.locator('[data-slot="tool-call-content"]')).toBeVisible();
    await expect(page.locator(`[data-achievement="${achievementId}"] input[type="radio"]`).first()).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach('tool-lesson-narrow-no-js', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  } finally { await context.close(); }
});
