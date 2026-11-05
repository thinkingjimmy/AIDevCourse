import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const course = '/zh/courses/agent-101';
const llmCourse = '/zh/courses/llm-101';
const lesson = `${llmCourse}/what-is-an-agent`;
const previous = `${llmCourse}/ai-chat-tips`;

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published Agent introduction.');

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`discover Agent 101 and finish LLM 101 on ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/zh');
    await expect(page.locator('#catalog h2')).toHaveText(['起步', '入门', '中级']);
    const beginner = page.getByRole('region', { name: '入门', exact: true });
    const intermediate = page.getByRole('region', { name: '中级', exact: true });
    await expect(beginner.getByRole('heading', { level: 3 })).toHaveText(['LLM 101', 'Coding 101', '设计 101']);
    await expect(intermediate.getByRole('heading', { level: 3 })).toHaveText(['Agent 101']);
    const card = intermediate.getByRole('link', { name: 'Agent 101', exact: true });
    await expect(card).toHaveAttribute('href', course);
    await expect(card).toContainText('中级 · 免费');
    await expect(page.locator('[data-slot="hero-primary-action"]')).toHaveAttribute('href', `${llmCourse}/what-a-language-model-does`);
    await testInfo.attach(`agent-card-${viewport.name}`, { body: await page.locator('#catalog').screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    await card.focus();
    await card.press('Enter');
    await expect(page).toHaveURL(course);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Agent 101');
    await expect(page.locator('main')).toContainText('中级');
    await expect(page.locator('[data-slot="course-empty"]')).toContainText('内容更新中');
    await expect(page.getByRole('link', { name: '开始第一课', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach(`agent-overview-${viewport.name}`, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });

    await page.goto(llmCourse);
    const entries = page.locator('section[aria-labelledby="course-catalog"] li a');
    await expect(entries).toHaveCount(14);
    await expect(entries.last()).toHaveAttribute('href', lesson);
    await expect(entries.last()).toContainText('3.5什么是 Agent？');
    await page.goto(previous);
    await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
    await expect(page).toHaveURL(lesson);
    await expect(page.locator('article h1')).toHaveText('什么是 Agent？');
    await expect(page.locator('article > .prose')).toContainText('文件修改成功');
    await expect(page.getByRole('button', { name: '标记为已完成', exact: true })).toBeEnabled();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${lesson}$`));
    if (viewport.width < 961) await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
    const sidebar = page.locator(viewport.width < 961 ? '[data-mobile="true"]' : '[data-slot="sidebar-inner"]');
    await expect(sidebar.locator('a[aria-current="page"]')).toContainText('3.5 什么是 Agent？');
    if (viewport.width < 961) await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await testInfo.attach(`agent-intro-${viewport.name}`, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
    await page.locator('article > .prose').getByRole('link', { name: 'Agent 101', exact: true }).click();
    await expect(page).toHaveURL(course);
    expect(errors).toEqual([]);
  });
}

test('find the Agent introduction through search and the sitemap', async ({ page, request }, testInfo) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  expect(xml).toContain(course);
  expect(xml).toContain(lesson);
  await page.goto('/zh');
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: '搜索课时' }).fill('什么是 Agent');
  const result = page.locator(`.search-result[href="${lesson}"]`).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(lesson);
  await expect(page.locator('article h1')).toHaveText('什么是 Agent？');
  await testInfo.attach('agent-published-routes', { body: JSON.stringify({ course, lesson, previous }, null, 2), contentType: 'application/json' });
});

test('read the introduction and open the course on a narrow screen without JavaScript', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width: 320, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(previous);
    await page.locator('[data-slot="mobile-native-menu"] summary').click();
    await page.locator(`[data-slot="mobile-native-panel"] a[href="${lesson}"]`).click();
    await expect(page).toHaveURL(lesson);
    await expect(page.locator('article h1')).toHaveText('什么是 Agent？');
    await expect(page.locator('article > .prose')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach('agent-intro-narrow-no-js', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    await page.locator('article > .prose').getByRole('link', { name: 'Agent 101', exact: true }).click();
    await expect(page).toHaveURL(course);
    await expect(page.locator('[data-slot="course-empty"]')).toContainText('内容更新中');
    await page.goto('/zh');
    await expect(page.locator('#catalog h2')).toHaveText(['起步', '入门', '中级']);
    await page.getByRole('region', { name: '中级', exact: true }).getByRole('link', { name: 'Agent 101', exact: true }).click();
    await expect(page).toHaveURL(course);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); }
});
