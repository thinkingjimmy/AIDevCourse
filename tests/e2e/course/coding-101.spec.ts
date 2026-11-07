import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const courseUrl = '/zh/courses/coding-101';
const basicsUrl = `${courseUrl}/what-is-json`;
const apiUrl = `${courseUrl}/call-ai-with-json`;

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published Coding 101 course.');

test('discover the curriculum, complete supplemental JSON exercises, and retain achievements', async ({ page }, testInfo) => {
  await page.goto('/zh');
  await page.getByRole('link', { name: 'Coding 101', exact: true }).click();
  await expect(page).toHaveURL(courseUrl);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Coding 101');
  const directory = page.locator('#course-catalog').locator('..');
  await expect(directory.getByRole('listitem')).toHaveCount(27);
  await expect(directory.getByRole('heading', { level: 3 })).toHaveText([
    '01看懂一个网站', '02前端：搭出导航站', '03后端：处理用户请求',
    '04数据库：保存与管理资源', '05把网站交付出去', '06拓展：做成自己的产品', '07补充阅读',
  ]);
  await testInfo.attach('coding-101-curriculum', { body: await directory.screenshot(), contentType: 'image/png' });
  await page.getByRole('link', { name: '开始第一课', exact: true }).click();
  await expect(page).toHaveURL(`${courseUrl}/frontend-backend-and-database`);
  await expect(page.locator('article h1')).toHaveText('前端、后端、数据库分别做什么');
  await expect(page.locator('article > .prose')).toBeEmpty();
  await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
  await expect(page).toHaveURL(`${courseUrl}/frameworks-components-and-apis`);
  await expect(page.locator('article h1')).toHaveText('框架、组件库、API 是什么');
  await page.goto(courseUrl);
  await directory.getByRole('link', { name: /JSON 是什么/ }).click();
  const lesson = page;
  await expect(lesson).toHaveURL(basicsUrl);
  const bag = JSON.parse((await lesson.locator('pre').filter({ hasText: '"bag"' }).textContent())!);
  expect(bag).toMatchObject({ books: 2, items: ['book', 'pencil'], hasWater: true, snack: null, owner: { name: 'Alex' } });
  const first = lesson.locator('[data-achievement="read-json-values"]');
  await first.getByRole('radio').first().click();
  await expect(first).toHaveAttribute('data-state', 'incorrect');
  await first.getByRole('radio').nth(1).click();
  await expect(first).toHaveAttribute('data-state', 'unlocked');
  await lesson.getByRole('button', { name: '标记为已完成', exact: true }).click();
  await expect(lesson).toHaveURL(apiUrl);
  const second = lesson.locator('[data-achievement="understand-ai-api-request"]');
  await second.getByRole('radio').nth(1).click();
  await expect(second).toHaveAttribute('data-state', 'unlocked');
  await lesson.reload();
  await expect(second).toHaveAttribute('data-state', 'unlocked');
  await lesson.getByRole('button', { name: '我的成就', exact: true }).click();
  const gallery = lesson.getByRole('dialog', { name: '我的成就' });
  await expect(gallery.locator('[data-earned="true"]')).toHaveCount(2);
  await expect(gallery.locator('[data-medal-course="coding-101"][data-earned="true"]')).toHaveCount(2);
  const totalAchievements = await gallery.locator('[data-medal]').count();
  expect(Number(await gallery.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeCloseTo(200 / totalAchievements);
  await testInfo.attach('coding-101-completed', { body: await gallery.screenshot(), contentType: 'image/png' });
  await lesson.close();
});

test('API lesson is searchable and preserves valid, copyable request examples', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => { document.documentElement.dataset.copiedCode = text; } },
    });
  });
  await page.goto('/zh');
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: '搜索课时' }).fill('JSON');
  const result = page.locator(`.search-result[href="${apiUrl}"]`);
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(apiUrl);
  const requests = page.locator('pre').filter({ hasText: '"model"' });
  await expect(requests).toHaveCount(2);
  const examples = [];
  for (const request of await requests.all()) {
    const example = JSON.parse((await request.textContent())!);
    expect(example.model).toBe('gpt-6-astra');
    expect(example.input).toMatch(/^Explain in Chinese/);
    expect(example).not.toHaveProperty('api_key');
    examples.push(example);
  }
  const command = page.locator('div.relative.my-7').filter({ has: page.locator('pre').filter({ hasText: '--data-binary @request.json' }) });
  const response = JSON.parse((await page.locator('pre').filter({ hasText: '"resp_example"' }).textContent())!);
  expect(response.status).toBe('completed');
  expect(response.output[0].content[0]).toMatchObject({ type: 'output_text', text: expect.any(String) });
  await command.getByRole('button', { name: '复制代码', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-copied-code', /Authorization: Bearer \$OPENAI_API_KEY/);
  await expect(page.locator('html')).toHaveAttribute('data-copied-code', /--write-out '\\nHTTP %\{http_code\}\\n'/);
  await testInfo.attach('coding-101-request-examples', { body: JSON.stringify(examples, null, 2), contentType: 'application/json' });
  const accessibility = await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
});

for (const scenario of [
  { name: 'mobile', width: 320, javaScriptEnabled: true },
  { name: 'no-js', width: 390, javaScriptEnabled: false },
]) {
  test(`both lessons remain readable on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 844 }, javaScriptEnabled: scenario.javaScriptEnabled });
    try {
      const page = await context.newPage();
      for (const [name, url] of [['basics', basicsUrl], ['api', apiUrl]]) {
        expect((await page.goto(url))?.status()).toBe(200);
        await expect(page.locator('article > .prose')).toBeVisible();
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const screenshot = testInfo.outputPath(`coding-101-${name}-${scenario.name}.png`);
        await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
        await testInfo.attach(`${name}-${scenario.name}`, { path: screenshot, contentType: 'image/png' });
      }
    } finally { await context.close(); }
  });
}
