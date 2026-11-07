import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readCatalog } from '../../../src/lib/content/manifest';

const course = '/zh/courses/llm-101';
const modelBasics = `${course}/open-models-and-local-deployment`;
const lesson = `${course}/how-to-choose-a-language-model`;
const contentDocument = (url: string) => readCatalog().documents.find((entry) => entry.url === url)!;

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published model selection lesson.');

async function checkAuthoredExercises(page: Page, url: string) {
  const definitions = contentDocument(url).achievements;
  await expect(page.locator('[data-achievement]')).toHaveCount(definitions.length);
  for (const definition of definitions) {
    const challenge = page.locator(`[data-achievement="${definition.id}"]`);
    const incorrect = definition.options.find((option) => option.value !== definition.answer)!;
    await challenge.locator(`input[value="${incorrect.value}"]`).click();
    await expect(challenge).toHaveAttribute('data-state', 'incorrect');
    await challenge.locator(`input[value="${definition.answer}"]`).click();
    await expect(challenge).toHaveAttribute('data-state', 'unlocked');
    await page.reload();
    await expect(challenge).toHaveAttribute('data-state', 'unlocked');
  }
}

test('thinking and multimodal lessons keep their reading and authored exercises', async ({ page }, testInfo) => {
  await page.goto(`${course}/how-language-models-are-trained`);
  for (const entry of [
    { slug: 'how-model-thinking-works', title: '模型的「深度思考」是怎么回事？', text: '980 元', headings: 6 },
    { slug: 'how-models-see-and-hear', title: '模型是如何看图和听声音的？', text: '语音转文字、理解音频、生成语音', headings: 4 },
  ]) {
    await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
    await expect(page).toHaveURL(`${course}/${entry.slug}`);
    await expect(page.locator('article h1')).toHaveText(entry.title);
    await expect(page.locator('article > .prose')).toContainText(entry.text);
    await expect(page.locator('article h2')).toHaveCount(entry.headings);
    await checkAuthoredExercises(page, `${course}/${entry.slug}`);
    const result = await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
    const screenshot = testInfo.outputPath(`${entry.slug}.png`);
    await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
    await testInfo.attach(entry.slug, { path: screenshot, contentType: 'image/png' });
  }
});

test('follow model basics into selection and preserve authored exercises', async ({ page }, testInfo) => {
  await page.goto(`${course}/how-models-see-and-hear`);
  await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
  await expect(page).toHaveURL(modelBasics);
  await expect(page.locator('article h1')).toHaveText('开源模型、参数量与本地运行');
  await expect(page.locator('article h2')).toHaveText(contentDocument(modelBasics).headings.filter((heading) => heading.depth === 2).map((heading) => heading.title));
  await expect(page.locator('article > .prose')).toContainText('5520 亿个参数');
  await expect(page.locator('[data-jimmy-note-anchor]')).toHaveCount(2);
  await expect(page.locator('article .katex')).toHaveCount(1);
  await expect(page.locator('[data-achievement]')).toHaveCount(0);
  const basicsAccessibility = await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(basicsAccessibility.violations).toEqual([]);
  await testInfo.attach('model-basics-independent-lesson', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
  await expect(page).toHaveURL(lesson);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('如何选择适合自己的大语言模型？');
  await expect(page.locator('article h2')).toHaveText(contentDocument(lesson).headings.filter((heading) => heading.depth === 2).map((heading) => heading.title));
  await checkAuthoredExercises(page, lesson);
  const accessibility = await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await testInfo.attach('model-selection-completed', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
  await expect(page).toHaveURL(`${course}/how-ai-chat-works`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('AI Chat 是如何工作的？');
});

test('split model basics keeps its desktop notes and mobile popovers', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1536, height: 960 });
  await page.goto(modelBasics);
  for (const id of ['001', '002']) {
    await expect(page.locator(`[data-jimmy-note-card="${id}"]`)).toBeVisible();
    await expect(page.locator(`[data-note-connector="${id}"]`)).toHaveAttribute('d', /^M /);
  }
  await testInfo.attach('model-basics-desktop-notes', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of ['001', '002']) {
    await page.locator(`[data-note-trigger-for="${id}"]`).click();
    const dialog = page.getByRole('dialog', { name: 'Jimmy 的批注', exact: true });
    await expect(dialog.getByRole('note', { name: 'Jimmy', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach(`model-basics-mobile-note-${id}`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  }
});

test('three modules expose ordered lessons through the catalog, sidebar, and search', async ({ page }, testInfo) => {
  await page.goto(course);
  const catalog = page.locator('section[aria-labelledby="course-catalog"]');
  await expect(catalog.locator('h3')).toHaveText(['01大语言模型的工作原理', '02模型的训练与能力', '03AI 应用的工作原理']);
  const groups = catalog.locator('ol');
  for (const [index, count] of [4, 5, 5].entries()) await expect(groups.nth(index).getByRole('listitem')).toHaveCount(count);
  const parts = ['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '2.4', '2.5', '3.1', '3.2', '3.3', '3.4', '3.5'];
  await expect(catalog.locator('li a > span:first-child')).toHaveText(parts);
  await expect(groups.nth(1).getByRole('link').nth(1)).toHaveAttribute('href', `${course}/how-model-thinking-works`);
  await expect(groups.nth(1).getByRole('link').nth(2)).toHaveAttribute('href', `${course}/how-models-see-and-hear`);
  await expect(groups.nth(1).getByRole('link').nth(3)).toHaveAttribute('href', modelBasics);
  await expect(groups.nth(1).getByRole('link').nth(3)).toContainText('2.4');
  await expect(groups.nth(1).getByRole('link').last()).toHaveAttribute('href', lesson);
  await expect(groups.nth(1).getByRole('link').last()).toContainText('2.5');
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
  await testInfo.attach('llm-101-module-routes', { body: JSON.stringify({ urls, parts }, null, 2), contentType: 'application/json' });
  await page.goto('/zh');
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: '搜索课时' }).fill('如何选择适合自己的大语言模型');
  const result = page.locator(`.search-result[href="${lesson}"]`).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(lesson);
});

test('thinking, multimodal, and model basics lessons are searchable', async ({ page }) => {
  for (const entry of [
    { slug: 'how-model-thinking-works', query: '深度思考' },
    { slug: 'how-models-see-and-hear', query: '看图' },
    { slug: 'open-models-and-local-deployment', query: 'MoE' },
  ]) {
    await page.goto('/zh');
    await page.keyboard.press('Control+k');
    const search = page.getByRole('textbox', { name: '搜索课时' });
    await expect(search).toBeFocused();
    await search.fill(entry.query);
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
    await expect(page.locator('[data-slot="sidebar-container"] [data-sidebar="menu-button"]').first()).toHaveText(`01 ${title}`);
    await expect(page.locator('[data-slot="sidebar-container"] [data-sidebar="menu-button"]')).toHaveCount(2);
    await expect(page.locator('article h1')).toHaveText(contentDocument(url).data.title);
  }
  await page.goto(`${course}/what-a-language-model-does`);
  const picker = page.locator('.language-picker').first();
  await picker.locator('summary').click();
  const english = picker.getByRole('link', { name: 'English', exact: true });
  await expect(english).not.toContainText('此课暂无译文');
  await english.click();
  await expect(page).toHaveURL('/courses/llm-101/what-a-language-model-does');
  await testInfo.attach('llm-101-translated-routes', { body: JSON.stringify(translations, null, 2), contentType: 'application/json' });
});

test('read both split lessons on a narrow screen without JavaScript', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 844 }, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    for (const entry of [
      { url: modelBasics, name: 'model-basics', questions: 5 },
      { url: lesson, name: 'model-selection', questions: 3 },
    ]) {
      expect((await page.goto(entry.url))?.status()).toBe(200);
      await expect(page.locator('article h2')).toHaveCount(entry.questions);
      if (entry.url === modelBasics) {
        await expect(page.locator('article .katex')).toHaveCount(1);
        await expect(page.locator('article > .prose')).toContainText('1325 GB');
        await expect(page.locator('[data-achievement]')).toHaveCount(0);
      } else {
        await expect(page.locator('[data-achievement]')).toHaveCount(0);
        await expect(page.locator('[data-embed="x"]').getByRole('link')).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach(`${entry.name}-narrow-no-js`, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
    }
    await page.goto(course);
    await expect(page.locator('section[aria-labelledby="course-catalog"] h3')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const screenshot = testInfo.outputPath('llm-101-modules-narrow-no-js.png');
    await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
    await testInfo.attach('llm-101-modules-narrow-no-js', { path: screenshot, contentType: 'image/png' });
  } finally { await context.close(); }
});
