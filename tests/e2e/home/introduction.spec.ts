import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published introduction course.');
const title = '从想法到作品';
const url = '/zh/courses/getting-started';
const lessonUrl = `${url}/what-to-learn-in-the-ai-era`;

for (const scenario of [
  { name: 'desktop', width: 1440, javaScriptEnabled: true },
  { name: 'phone', width: 390, javaScriptEnabled: true },
  { name: 'narrow phone', width: 320, javaScriptEnabled: true },
  { name: 'without JavaScript', width: 320, javaScriptEnabled: false },
]) {
  test(`getting started opens a separate course directory on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 960 },
      javaScriptEnabled: scenario.javaScriptEnabled, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/zh');
      await expect(page.locator('#catalog h2')).toHaveText(['起步', '入门', '中级']);
      const card = page.getByRole('region', { name: '起步', exact: true }).getByRole('link', { name: title, exact: true });
      await expect(card).toHaveAttribute('href', url);
      await expect(card.locator('.disk-meta')).toHaveText('起步3 课');
      await expect(page.locator('[data-slot="hero-primary-action"]')).toHaveAttribute('href', url);
      await expect(page.getByRole('region', { name: '入门', exact: true }).getByRole('heading', { level: 3 })).toHaveText(['LLM 101', 'Coding 101', '设计 101']);
      if (scenario.javaScriptEnabled) expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
      await card.focus(); await card.press('Enter');
      await expect(page).toHaveURL(url);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page.locator('.course-overview-description')).toBeVisible();
      await expect(page.getByRole('heading', { name: '课程目录', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: '1.1 AI 时代，我们到底要学什么?', exact: true })).toHaveAttribute('href', lessonUrl);
      await expect(page.getByRole('link', { name: '2.1 关于这门课', exact: true })).toHaveAttribute('href', `${url}/about-this-course`);
      await expect(page.locator('[role="tablist"]')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: /你将学会|适合谁学/ })).toHaveCount(0);
      await testInfo.attach('Independent course directory', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      await page.reload();
      await page.getByRole('link', { name: '开始第一课', exact: true }).click();
      await expect(page).toHaveURL(lessonUrl);
      await expect(page.locator('article h1')).toHaveText('AI 时代，我们到底要学什么?');
      await expect(page.locator('article > .prose h2').first()).toBeVisible();
      await expect(page.locator('article > .prose')).not.toBeEmpty();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      await page.getByRole('banner').locator('.site-header-logo').click();
      await expect(card).toBeVisible();
    } finally { await context.close(); }
  });
}

test('untranslated introduction groups stay hidden', async ({ page }, testInfo) => {
  for (const path of ['/', '/ja', '/fr', '/es']) {
    await page.goto(path);
    await expect(page.locator('#courses-introduction')).toHaveCount(0);
    await expect(page.locator('#catalog h2')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'LLM 101', exact: true })).toBeVisible();
  }
  await testInfo.attach('Localized catalog', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('renamed introduction redirects saved links and restores completion', async ({ page, request }, testInfo) => {
  const evidence = [];
  for (const suffix of ['', '/what-to-learn-in-the-ai-era', '/what-to-do-when-anxious', '/about-this-course']) {
    const source = `/zh/courses/ai-coding${suffix}`;
    const destination = `${url}${suffix}`;
    const response = await request.get(source, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe(destination);
    evidence.push({ source, destination, status: response.status() });
  }
  const key = 'lac:v1:ai-coding:completion:about-this-course';
  const value = JSON.stringify({ completedAt: '2026-11-05T00:00:00.000Z' });
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key, value });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/zh/courses/ai-coding/about-this-course?from=bookmark');
  await expect(page).toHaveURL(`${url}/about-this-course?from=bookmark`);
  await expect(page.locator('article h1')).toHaveText('关于这门课');
  await expect(page.locator('[data-slot="sidebar-inner"] a[aria-current="page"] [data-slot="lesson-completed"]')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(value);
  await testInfo.attach('Redirected course links', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  await testInfo.attach('Restored lesson completion', { body: await page.screenshot(), contentType: 'image/png' });
});
