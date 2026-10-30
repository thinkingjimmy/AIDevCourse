import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const course = '/zh/courses/llm-101';
const lesson = `${course}/how-to-choose-a-language-model`;

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published model selection lesson.');

test('follow thinking and multimodal lessons into model selection and retain achievements', async ({ page }, testInfo) => {
  await page.goto(`${course}/how-language-models-are-trained-part-1`);
  for (const entry of [
    { slug: 'how-model-thinking-works', title: '模型的「深度思考」是怎么回事？', achievement: 'thinking-is-not-verification', text: '980 元' },
    { slug: 'how-models-see-and-hear', title: '模型是如何看图和听声音的？', achievement: 'distinguish-audio-inputs', text: '语音转文字、理解音频、生成语音' },
  ]) {
    await page.locator('article nav').getByRole('link', { name: /下一课/ }).click();
    await expect(page).toHaveURL(`${course}/${entry.slug}`);
    await expect(page.locator('article h1')).toHaveText(entry.title);
    await expect(page.locator('article > .prose')).toContainText(entry.text);
    await expect(page.locator('article h2')).toHaveCount(6);
    const challenge = page.locator(`[data-achievement="${entry.achievement}"]`);
    await challenge.getByRole('radio').first().click();
    await expect(challenge).toHaveAttribute('data-state', 'incorrect');
    await challenge.getByRole('radio').nth(1).click();
    await expect(challenge).toHaveAttribute('data-state', 'unlocked');
    await page.reload();
    await expect(challenge).toHaveAttribute('data-state', 'unlocked');
    const result = await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
    const screenshot = testInfo.outputPath(`${entry.slug}.png`);
    await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
    await testInfo.attach(entry.slug, { path: screenshot, contentType: 'image/png' });
  }
  await page.locator('article nav').getByRole('link', { name: /下一课/ }).click();
  await expect(page).toHaveURL(lesson);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('如何选择适合自己的大语言模型？');
  await expect(page.locator('article h2').filter({ hasText: /^Q[1-4]：/ })).toHaveCount(4);
  await expect(page.locator('article > .prose')).toContainText('600 亿个参数');
  const achievement = page.locator('[data-achievement="choose-model-for-task"]');
  await achievement.getByRole('radio').first().click();
  await expect(achievement).toHaveAttribute('data-state', 'incorrect');
  await achievement.getByRole('radio').nth(1).click();
  await expect(achievement).toHaveAttribute('data-state', 'unlocked');
  await page.reload();
  await expect(achievement).toHaveAttribute('data-state', 'unlocked');
  const accessibility = await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await testInfo.attach('model-selection-completed', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  await page.locator('article nav').getByRole('link', { name: /下一课/ }).click();
  await expect(page).toHaveURL(`${course}/how-ai-chat-works`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('AI Chat 是如何工作的？');
});

test('three modules expose ordered lessons through the catalog, sidebar, and search', async ({ page }, testInfo) => {
  await page.goto(course);
  const catalog = page.locator('section[aria-labelledby="course-catalog"]');
  await expect(catalog.locator('h3')).toHaveText(['01大语言模型的工作原理', '02模型的训练与能力', '03AI 应用的工作原理']);
  const groups = catalog.locator('ol');
  for (const [index, count] of [4, 4, 1].entries()) await expect(groups.nth(index).getByRole('listitem')).toHaveCount(count);
  await expect(catalog.locator('li a > span:first-child')).toHaveText(['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '2.4', '3.1']);
  await expect(groups.nth(1).getByRole('link').nth(1)).toHaveAttribute('href', `${course}/how-model-thinking-works`);
  await expect(groups.nth(1).getByRole('link').nth(2)).toHaveAttribute('href', `${course}/how-models-see-and-hear`);
  await expect(groups.nth(1).getByRole('link').last()).toHaveAttribute('href', lesson);
  await expect(catalog.getByRole('link', { name: /如何选择适合自己的大语言模型/ })).toHaveAttribute('href', lesson);
  const urls = await catalog.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
  for (const url of urls) {
    expect((await page.goto(url))?.status(), url).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${url}$`));
  }
  await page.goto(course);
  const screenshot = testInfo.outputPath('llm-101-three-modules.png');
  await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
  await testInfo.attach('llm-101-three-modules', { path: screenshot, contentType: 'image/png' });
  await page.goto(lesson);
  const sidebar = page.locator('[data-slot="sidebar-container"]');
  await expect(sidebar.locator('[data-sidebar="menu-button"]')).toHaveText(['01 大语言模型的工作原理', '02 模型的训练与能力', '03 AI 应用的工作原理']);
  await expect(sidebar.getByRole('button', { name: '02 模型的训练与能力', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(sidebar.locator('a[aria-current="page"]')).toHaveAttribute('href', lesson);
  await testInfo.attach('llm-101-module-routes', { body: JSON.stringify({ urls, parts: ['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '2.4', '3.1'] }, null, 2), contentType: 'application/json' });
  await page.goto('/zh');
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: '搜索课时' }).fill('选择');
  const result = page.locator(`.search-result[href="${lesson}"]`);
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(lesson);
});

test('thinking and multimodal lessons are searchable', async ({ page }) => {
  for (const entry of [
    { slug: 'how-model-thinking-works', query: '深度思考' },
    { slug: 'how-models-see-and-hear', query: '看图' },
  ]) {
    await page.goto('/zh');
    await page.keyboard.press('Control+k');
    await page.getByRole('textbox', { name: '搜索课时' }).fill(entry.query);
    const result = page.locator(`.search-result[href="${course}/${entry.slug}"]`).first();
    await expect(result).toBeVisible();
    await result.click();
    await expect(page).toHaveURL(`${course}/${entry.slug}`);
  }
});

test('the relocated first lesson keeps language switching and its public URLs', async ({ page }, testInfo) => {
  const translations = [
    { url: '/courses/llm-101/what-a-language-model-does', title: 'How language models work' },
    { url: '/ja/courses/llm-101/what-a-language-model-does', title: '大規模言語モデルの仕組み' },
    { url: '/fr/courses/llm-101/what-a-language-model-does', title: 'Comment fonctionnent les modèles de langage' },
    { url: '/es/courses/llm-101/what-a-language-model-does', title: 'Cómo funcionan los modelos de lenguaje' },
  ];
  for (const { url, title } of translations) {
    expect((await page.goto(url))?.status()).toBe(200);
    await expect(page.locator('[data-slot="sidebar-container"] [data-sidebar="menu-button"]')).toHaveText(`01 ${title}`);
    await expect(page.locator('article h1')).toHaveText('What a language model does');
  }
  await page.goto(`${course}/what-a-language-model-does`);
  await page.getByRole('button', { name: '更多', exact: true }).click();
  await page.getByRole('menuitem', { name: '修改语言', exact: true }).click();
  const english = page.locator('.language-options a[href="/courses/llm-101/what-a-language-model-does"]');
  await expect(english).not.toContainText('此课暂无译文');
  await english.click();
  await expect(page).toHaveURL('/courses/llm-101/what-a-language-model-does');
  await testInfo.attach('llm-101-translated-routes', { body: JSON.stringify(translations, null, 2), contentType: 'application/json' });
});

test('read all four questions on a narrow screen without JavaScript', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 844 }, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    expect((await page.goto(lesson))?.status()).toBe(200);
    await expect(page.locator('article h2').filter({ hasText: /^Q[1-4]：/ })).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach('model-selection-narrow-no-js', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
    for (const slug of ['how-model-thinking-works', 'how-models-see-and-hear']) {
      expect((await page.goto(`${course}/${slug}`))?.status()).toBe(200);
      await expect(page.locator('article h1')).toHaveCount(1);
      await expect(page.locator('article h2')).toHaveCount(6);
      await expect(page.locator('[data-achievement] legend')).toBeVisible();
      await expect(page.locator('[data-achievement] input[type="radio"]').first()).toBeDisabled();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const screenshot = testInfo.outputPath(`${slug}-narrow-no-js.png`);
      await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
      await testInfo.attach(`${slug}-narrow-no-js`, { path: screenshot, contentType: 'image/png' });
    }
    await page.goto(course);
    await expect(page.locator('section[aria-labelledby="course-catalog"] h3')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const screenshot = testInfo.outputPath('llm-101-modules-narrow-no-js.png');
    await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
    await testInfo.attach('llm-101-modules-narrow-no-js', { path: screenshot, contentType: 'image/png' });
  } finally { await context.close(); }
});
