import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readCatalog } from '../../../src/lib/content/manifest';

const course = '/zh/courses/llm-101';
const lesson = `${course}/ai-chat-advice`;
const previous = `${course}/what-is-a-tool`;
const artifactLesson = `${course}/ai-chat-tips`;
const title = '使用 AI Chat 的几个建议';
const artifactTitle = 'AI Chat 实用技巧';
const artifactHeadings = readCatalog().documents.find((entry) => entry.url === artifactLesson)?.headings.filter((heading) => heading.depth === 2).map((heading) => heading.title) ?? [];
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
    const artifactEntry = page.locator('section[aria-labelledby="course-catalog"]').getByRole('link', { name: artifactTitle });
    await expect(artifactEntry).toHaveAttribute('href', artifactLesson);
    await expect(artifactEntry.locator('> span:first-child')).toHaveText('3.4');
    await page.goto(previous);
    await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
    await expect(page).toHaveURL(lesson);
    await expect(page.locator('article h1')).toHaveText(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${lesson}$`));
    await expect(page.getByRole('button', { name: '标记为已完成', exact: true })).toBeEnabled();
    await expect(page.locator('article').getByRole('heading', { name: '三、多引导 AI 进行提问和复述' })).toBeVisible();
    await expect(page.locator('article').getByRole('heading', { name: '四、接受 AI 的能力边界' })).toBeVisible();
    await expect(page.locator('article').getByRole('heading', { name: '五、成就挑战' })).toBeVisible();
    await expect(page.locator('[data-newton-demo]')).toHaveCount(0);
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
    await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
    await expect(page).toHaveURL(artifactLesson);
    await expect(page.locator('article h1')).toHaveText(artifactTitle);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${artifactLesson}$`));
    await expect(page.locator('article').getByRole('link', { name: '使用 AI Chat 的几个建议', exact: true })).toHaveAttribute('href', lesson);
    await expect(page.getByRole('figure', { name: '牛顿第二定律交互演示' })).toBeVisible();
    await expect(page.locator('article h2')).toHaveText(artifactHeadings);
    if (viewport.width < 961) await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
    await expect(sidebar.locator('a[aria-current="page"]')).toContainText(`3.4 ${artifactTitle}`);
    if (viewport.width < 961) await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const artifactAccessibility = await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(artifactAccessibility.violations).toEqual([]);
    await testInfo.attach(`artifact-lesson-${viewport.name}`, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  });
}

for (const entry of [
  { name: 'chat-uses', url: lesson, previousUrl: `${course}/what-can-you-do-with-ai-chat`, title },
  { name: 'artifacts', url: artifactLesson, previousUrl: `${course}/how-to-use-ai-artifacts`, title: artifactTitle },
]) {
  test(`${entry.name} lesson is available through search and its previous URL`, async ({ page, request }, testInfo) => {
    const redirect = await request.get(entry.previousUrl, { maxRedirects: 0 });
    expect(redirect.status()).toBe(308);
    expect(redirect.headers().location).toBe(entry.url);
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain(entry.url);
    expect(sitemap).not.toContain(entry.previousUrl);
    await page.goto('/zh');
    await page.keyboard.press('Control+k');
    await page.getByRole('textbox', { name: '搜索课时' }).fill(entry.title);
    const result = page.locator(`.search-result[href="${entry.url}"]`).first();
    await expect(result).toBeVisible();
    await result.click();
    await expect(page).toHaveURL(entry.url);
    await expect(page.locator('article h1')).toHaveText(entry.title);
    await testInfo.attach(`${entry.name}-search`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    await page.goto(entry.previousUrl);
    await expect(page).toHaveURL(entry.url);
    await expect(page.locator('article h1')).toHaveText(entry.title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${entry.url}$`));
    await testInfo.attach(`${entry.name}-redirect`, { body: JSON.stringify({ source: entry.previousUrl, destination: page.url(), status: redirect.status(), title: entry.title }, null, 2), contentType: 'application/json' });
  });

  test(`${entry.name} lesson remains readable on a narrow screen without JavaScript`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 844 }, javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      expect((await page.goto(entry.url))?.status()).toBe(200);
      await expect(page.locator('article h1')).toHaveText(entry.title);
      if (entry.url === lesson) {
        await expect(page.locator('article').getByRole('heading', { name: '四、接受 AI 的能力边界' })).toBeVisible();
        await expect(page.locator(`[data-achievement="${achievementId}"] input[type="radio"]`).first()).toBeDisabled();
      } else {
        await expect(page.getByRole('figure', { name: '牛顿第二定律交互演示' })).toBeVisible();
        await expect(page.locator('article h2')).toHaveText(artifactHeadings);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach(`${entry.name}-narrow-no-js`, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
    } finally { await context.close(); }
  });
}
