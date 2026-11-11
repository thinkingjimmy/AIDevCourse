import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { capture } from './applications/helpers';

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
  await expect(directory.getByRole('listitem')).toHaveCount(28);
  await expect(directory.getByRole('heading', { level: 3 })).toHaveText([
    '01学前必看', '02看懂一个网站', '03前端：搭出导航站', '04后端：处理用户请求',
    '05数据库：保存与管理资源', '06把网站交付出去', '07拓展：做成自己的产品', '08补充阅读',
  ]);
  await testInfo.attach('coding-101-curriculum', { body: await directory.screenshot(), contentType: 'image/png' });
  await page.getByRole('link', { name: '开始第一课', exact: true }).click();
  await expect(page).toHaveURL(`${courseUrl}/about-this-course`);
  await expect(page.locator('article h1')).toHaveText('关于这门课');
  const introduction = page.locator('article > .prose');
  await expect(introduction).toBeVisible();
  await expect(introduction.getByRole('heading', { level: 2 }).first()).toBeVisible();
  await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
  await expect(page).toHaveURL(`${courseUrl}/frontend-backend-and-database`);
  await expect(page.locator('article h1')).toHaveText('前端、后端、数据库分别做什么');
  const foundations = page.locator('article > .prose');
  await expect(foundations).toBeVisible();
  await expect(foundations.getByRole('heading', { level: 2 }).first()).toBeVisible();
  const layers = page.locator('[data-achievement="three-layers"]');
  await layers.getByRole('radio').first().click();
  await expect(layers).toHaveAttribute('data-state', 'unlocked');
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
  await expect(gallery.locator('[data-earned="true"]')).toHaveCount(3);
  await expect(gallery.locator('[data-medal-course="coding-101"][data-earned="true"]')).toHaveCount(3);
  const totalAchievements = await gallery.locator('[data-medal]').count();
  expect(Number(await gallery.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeCloseTo(300 / totalAchievements);
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

test('renders the HTML, CSS, and JavaScript example with a working add button', async ({ page }, testInfo) => {
  await page.goto(`${courseUrl}/frontend-backend-and-database`);
  await expect(page.locator('[data-inspector-animation]')).toHaveAttribute('data-ready', 'true');
  const demo = page.locator('[data-frontend-layers]');
  await expect(demo).toBeVisible();
  await expect(demo.locator('[data-stage]')).toHaveCount(3);
  await expect(demo.locator('[data-tool]')).toHaveCount(0);

  const js = demo.locator('[data-stage="js"]');
  const add = js.getByRole('button');
  await expect(add).toHaveText('添加工具');
  await add.click();
  await expect(js.locator('[data-tool]')).toHaveCount(1);
  await expect(js.locator('[data-tool]')).toHaveText('视频工具');
  await add.click();
  await expect(js.locator('[data-tool]')).toHaveCount(2);
  await add.click();
  await expect(js.locator('[data-tool]')).toHaveCount(3);
  await expect(add).toHaveText('已全部添加');
  await expect(add).toBeDisabled();
  await expect(demo.locator('[data-stage="html"] [data-tool]')).toHaveCount(0);
  await expect(demo.locator('[data-stage="css"] [data-tool]')).toHaveCount(0);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await demo.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await testInfo.attach('frontend-layers', { body: await demo.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
});

test('frontend inspector shows element picking and holds the typed text before updating the preview', async ({ page }, testInfo) => {
  const errors: string[] = [];
  let elapsed = 0;
  async function advanceTo(time: number) {
    await page.clock.runFor(time - elapsed);
    elapsed = time;
  }
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-11-09T10:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-09T10:00:01Z'));
  await page.goto(`${courseUrl}/frontend-backend-and-database`);
  const demo = page.locator('[data-frontend-inspector]');
  const animation = demo.locator('[data-inspector-animation]');
  const scene = demo.locator('[data-inspector-scene]').first();
  const title = scene.locator('[data-inspector-preview-title]');
  const code = scene.locator('[data-inspector-target="text"]');
  const caption = demo.locator('[data-inspector-caption]');
  await expect(animation).toHaveAttribute('data-ready', 'true');
  const controls = demo.locator('[data-inspector-controls]');
  const layout = await controls.evaluate((element) => ({ top: element.getBoundingClientRect().top, sceneBottom: element.parentElement!.querySelector('[data-inspector-scene]')!.getBoundingClientRect().bottom, right: element.getBoundingClientRect().right, lastButtonRight: element.querySelector('button:last-child')!.getBoundingClientRect().right }));
  expect(layout.top).toBeGreaterThanOrEqual(layout.sceneBottom);
  expect(layout.right - layout.lastButtonRight).toBeLessThanOrEqual(12);
  await expect(controls.getByRole('button')).toHaveCount(2);
  await expect(controls.getByRole('button')).toHaveText(['', '']);
  await expect(demo.getByRole('group', { name: '演示步骤' })).toHaveCount(0);
  await demo.getByRole('button', { name: '从头播放', exact: true }).click();
  await advanceTo(2200);
  await expect(scene.locator('[data-inspector-menu]')).toHaveAttribute('data-open', 'true');
  await expect(scene.locator('[data-inspector-target="inspect"]')).toHaveAttribute('data-active', 'true');
  await expect(caption).toHaveText('选择「检查」');
  const menuCursor = await scene.locator('[data-playing]').getAttribute('style');
  await advanceTo(3000);
  await expect(animation).toHaveAttribute('data-playing', 'true');
  await expect(scene.locator('[data-playing]')).toHaveAttribute('style', menuCursor!);
  await expect(caption).toHaveText('选择「检查」');
  await advanceTo(5400);
  await expect(scene.locator('[data-inspector-picker]')).toHaveAttribute('data-active', 'true');
  await advanceTo(6300);
  await expect(title).toHaveAttribute('data-highlighted', 'true');
  await expect(caption).toHaveText('点击高亮的标题');
  await expect(scene.locator('[data-inspector-node]')).toHaveAttribute('data-active', 'false');
  const hoverCursor = await scene.locator('[data-playing]').getAttribute('style');
  await advanceTo(7100);
  await expect(title).toHaveAttribute('data-highlighted', 'true');
  await expect(scene.locator('[data-playing]')).toHaveAttribute('style', hoverCursor!);
  await advanceTo(7800);
  await expect(title).toHaveAttribute('data-highlighted', 'false');
  await expect(scene.locator('[data-inspector-picker]')).toHaveAttribute('data-active', 'false');
  await expect(scene.locator('[data-inspector-node]')).toHaveAttribute('data-active', 'true');
  await advanceTo(9600);
  await expect(code).toHaveAttribute('data-selected', 'true');
  await advanceTo(10400);
  await expect(code).toHaveAttribute('data-selected', 'true');
  await expect(code).toHaveText('My AI Tools');
  await advanceTo(11100);
  const typing = await code.innerText();
  expect(typing.length).toBeGreaterThan(0);
  expect(typing).not.toBe('My First Website');
  await expect(caption).toHaveText('输入新标题');
  await expect(title).toHaveText('My AI Tools');
  await advanceTo(12100);
  await expect(code).toHaveText('My First Website');
  await expect(title).toHaveText('My AI Tools');
  await expect(scene.locator('[data-inspector-enter]')).toHaveAttribute('data-visible', 'false');
  await expect(caption).toBeVisible();
  await expect(demo.locator('[data-inspector-screen] [data-inspector-caption]')).toBeVisible();
  await expect(caption).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(caption).toHaveText('按 Enter，应用修改');
  await expect(caption.locator('kbd')).toHaveText('Enter');
  await demo.getByRole('button', { name: '暂停演示', exact: true }).click();
  const paused = await animation.getAttribute('data-time');
  const cursor = await scene.locator('[data-playing]').getAttribute('style');
  await page.clock.runFor(1000);
  await expect(animation).toHaveAttribute('data-time', paused!);
  await expect(scene.locator('[data-playing]')).toHaveAttribute('style', cursor!);
  await capture(demo, 'frontend-animation-typed-before-confirm');
  await demo.getByRole('button', { name: '继续播放', exact: true }).click();
  await advanceTo(14150);
  await expect(title).toHaveText('My AI Tools');
  await expect(scene.locator('[data-inspector-enter]')).toHaveAttribute('data-visible', 'false');
  await advanceTo(14200);
  await expect(scene.locator('[data-inspector-enter]')).toHaveAttribute('data-visible', 'true');
  await expect(title).toHaveText('My AI Tools');
  await advanceTo(15150);
  await expect(title).toHaveText('My AI Tools');
  await expect(caption).toHaveText('按 Enter，应用修改');
  await advanceTo(15200);
  await expect(title).toHaveText('My First Website');
  await expect(caption).toHaveText('页面标题已更新');
  await expect(caption.locator('kbd')).toHaveCount(0);
  await advanceTo(17400);
  await expect(animation).toHaveAttribute('data-time', '17400');
  await expect(animation).toHaveAttribute('data-playing', 'false');
  await page.clock.runFor(3000);
  await expect(animation).toHaveAttribute('data-time', '17400');
  await expect(title).toHaveText('My First Website');
  await capture(demo, 'frontend-animation-result');
  await page.clock.resume();
  const accessibility = await new AxeBuilder({ page }).include('[data-frontend-inspector]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(errors).toEqual([]);
  await testInfo.attach('frontend-animation-verification', { body: JSON.stringify({ errors, typing, accessibilityViolations: accessibility.violations, pausedTime: paused, finalTime: 17400, layout, readingPausesVerified: true, inputCompletedBeforePreview: true }, null, 2), contentType: 'application/json' });
});

test('frontend inspector Enter subtitle stays readable on a narrow phone with enlarged text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.clock.install({ time: new Date('2026-11-09T10:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-09T10:00:01Z'));
  await page.goto(`${courseUrl}/frontend-backend-and-database`);
  await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
  const demo = page.locator('[data-frontend-inspector]');
  await expect(demo.locator('[data-inspector-animation]')).toHaveAttribute('data-ready', 'true');
  await demo.getByRole('button', { name: '从头播放', exact: true }).click();
  await page.clock.runFor(12100);
  await demo.getByRole('button', { name: '暂停演示', exact: true }).click();
  const caption = demo.locator('[data-inspector-caption]');
  await expect(caption).toHaveText('按 Enter，应用修改');
  await expect(caption.locator('kbd')).toBeVisible();
  await expect(demo.locator('[data-inspector-preview-title]').first()).toHaveText('My AI Tools');
  const placement = await caption.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const screen = element.closest('[data-inspector-screen]')!.getBoundingClientRect();
    const code = element.closest('[data-inspector-screen]')!.querySelector('[data-inspector-target="text"]')!.getBoundingClientRect();
    return {
      inside: bounds.top >= screen.top && bounds.bottom <= screen.bottom && bounds.left >= screen.left && bounds.right <= screen.right,
      centered: Math.abs((bounds.left + bounds.right) / 2 - (screen.left + screen.right) / 2) <= 1,
      clearOfCode: bounds.top >= code.bottom + 4,
      background: getComputedStyle(element).backgroundColor,
    };
  });
  expect(placement).toMatchObject({ inside: true, centered: true, clearOfCode: true });
  expect(placement.background).not.toBe('rgba(0, 0, 0, 0)');
  await expect(caption).toHaveCSS('color', 'rgb(255, 255, 255)');
  expect(await caption.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await demo.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(demo, 'frontend-enter-subtitle-narrow-enlarged');
  await page.clock.resume();
  const accessibility = await new AxeBuilder({ page }).include('[data-inspector-controls]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('frontend inspector pauses offscreen and supports static reduced-motion controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-11-09T10:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-09T10:00:01Z'));
  await page.goto(`${courseUrl}/frontend-backend-and-database`);
  const demo = page.locator('[data-frontend-inspector]');
  const animation = demo.locator('[data-inspector-animation]');
  const scene = demo.locator('[data-inspector-scene]').first();
  await expect(animation).toHaveAttribute('data-ready', 'true');
  await animation.scrollIntoViewIfNeeded();
  await page.clock.runFor(500);
  await expect(animation).toHaveAttribute('data-playing', 'true');
  await page.locator('article h1').scrollIntoViewIfNeeded();
  await expect(animation).toHaveAttribute('data-playing', 'false');
  const paused = await animation.getAttribute('data-time');
  await page.clock.runFor(1000);
  await expect(animation).toHaveAttribute('data-time', paused!);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(animation).toHaveAttribute('data-reduced', 'true');
  await animation.scrollIntoViewIfNeeded();
  await expect(scene.locator('[data-inspector-preview-title]')).toHaveText('My First Website');
  await expect(demo.getByRole('button', { name: '暂停演示' })).toHaveCount(0);
  await page.clock.runFor(2000);
  await expect(animation).toHaveAttribute('data-time', '16000');
  await demo.getByRole('button', { name: '查看初始状态', exact: true }).click();
  await expect(animation).toHaveAttribute('data-time', '0');
  await expect(scene.locator('[data-inspector-preview-title]')).toHaveText('My AI Tools');
  await page.clock.runFor(2000);
  await expect(animation).toHaveAttribute('data-time', '0');
  await demo.getByRole('button', { name: '查看修改结果', exact: true }).click();
  await expect(animation).toHaveAttribute('data-time', '16000');
  await expect(scene.locator('[data-inspector-preview-title]')).toHaveText('My First Website');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(demo, 'frontend-animation-phone-reduced-motion');
});

test('frontend inspector practice is independent and supports browser and keyboard editing', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${courseUrl}/frontend-backend-and-database`);
  const demo = page.locator('[data-frontend-inspector]');
  const practice = page.locator('[data-frontend-inspector-practice]');
  const title = practice.locator('#frontend-playground-title');
  const source = practice.locator('[data-inspector-source]');
  const status = practice.getByRole('status');
  await expect(practice).toBeVisible();
  await expect(title).toHaveText('My AI Tools');
  expect(await practice.evaluate((element) => [...element.closest('article')!.querySelectorAll('h2')].filter((heading) => heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING).at(-1)?.textContent)).toContain('二、前端');
  expect(await practice.evaluate((element) => element.previousElementSibling?.hasAttribute('data-frontend-inspector'))).toBe(true);
  await title.evaluate((element) => { element.textContent = 'My Personal Tools'; });
  await expect(source).toContainText('My Personal Tools');
  await expect(status).toHaveText('文字已修改。');
  await demo.getByRole('button', { name: '从头播放', exact: true }).click();
  await expect(title).toHaveText('My Personal Tools');
  const input = practice.getByRole('textbox', { name: '新的标题文字' });
  await practice.getByText('新的标题文字', { exact: true }).click();
  await expect(input).toBeFocused();
  await input.fill('My Learning Notes');
  await expect(title).toHaveText('My Personal Tools');
  await input.press('Enter');
  await expect(title).toHaveText('My Learning Notes');
  await expect(source).toContainText('My Learning Notes');
  await input.fill('<img src=x onerror="alert(1)">');
  await input.press('Enter');
  await expect(title).toHaveText('<img src=x onerror="alert(1)">');
  await expect(title.locator('img')).toHaveCount(0);
  await expect(source).toContainText('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  await practice.getByRole('button', { name: '恢复原样' }).click();
  await expect(title).toHaveText('My AI Tools');
  await expect(input).toHaveValue('My First Website');
  await expect(status).toHaveAttribute('data-edited', 'false');
  await input.press('Enter');
  await capture(practice, 'frontend-inspector-practice');
  const accessibility = await new AxeBuilder({ page }).include('[data-frontend-inspector-practice]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.reload();
  await expect(title).toHaveText('My AI Tools');
  await expect(status).toHaveAttribute('data-edited', 'false');
  expect(errors).toEqual([]);
  await testInfo.attach('frontend-practice-verification', { body: JSON.stringify({ errors, accessibilityViolations: accessibility.violations, independentFromPlayback: true }, null, 2), contentType: 'application/json' });
});

test('frontend inspector stays usable on a narrow phone with enlarged text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${courseUrl}/frontend-backend-and-database`);
  await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
  const demo = page.locator('[data-frontend-inspector]');
  await expect(demo.locator('[data-inspector-animation]')).toHaveAttribute('data-ready', 'true');
  const practice = page.locator('[data-frontend-inspector-practice]');
  const input = practice.getByRole('textbox', { name: '新的标题文字' });
  expect(await input.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  const text = 'A'.repeat(100);
  await input.fill(text);
  await practice.getByRole('button', { name: '修改文字', exact: true }).click();
  await expect(practice.locator('#frontend-playground-title')).toHaveText(text);
  await expect(practice.getByRole('status')).toHaveText('文字已修改。');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await practice.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await demo.getByRole('button', { name: '查看修改结果', exact: true }).click();
  expect(await demo.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await capture(demo, 'frontend-animation-narrow-enlarged');
  await capture(practice, 'frontend-practice-narrow-enlarged');
});

test('frontend inspector retains separate illustrations and practice without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 844 }, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(`${courseUrl}/frontend-backend-and-database`);
    const demo = page.locator('[data-frontend-inspector]');
    const practice = page.locator('[data-frontend-inspector-practice]');
    await expect(demo.locator('noscript [data-inspector-preview-title]')).toHaveText('My First Website');
    await expect(demo.getByRole('button', { name: '从头播放' })).not.toBeVisible();
    await expect(practice.locator('#frontend-playground-title')).toHaveText('My AI Tools');
    await expect(practice.locator('[data-inspector-source]')).toContainText('My AI Tools');
    await expect(practice.getByRole('button', { name: '恢复原样' })).not.toBeVisible();
    await expect(practice.getByRole('textbox')).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await capture(demo, 'frontend-animation-no-javascript');
    await capture(practice, 'frontend-practice-no-javascript');
  } finally { await context.close(); }
});

for (const scenario of [
  { name: 'mobile', width: 320, javaScriptEnabled: true },
  { name: 'no-js', width: 390, javaScriptEnabled: false },
]) {
  test(`all lessons remain readable on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 844 }, javaScriptEnabled: scenario.javaScriptEnabled });
    try {
      const page = await context.newPage();
      for (const [name, url] of [['introduction', `${courseUrl}/about-this-course`], ['foundations', `${courseUrl}/frontend-backend-and-database`], ['basics', basicsUrl], ['api', apiUrl]]) {
        expect((await page.goto(url))?.status()).toBe(200);
        await expect(page.locator('article > .prose')).toBeVisible();
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        if (name === 'foundations') {
          await expect(page.locator('[data-frontend-layers] [data-stage]')).toHaveCount(3);
          if (!scenario.javaScriptEnabled) await expect(page.locator('[data-frontend-layers]').getByText('启用 JavaScript 后')).toBeVisible();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const screenshot = testInfo.outputPath(`coding-101-${name}-${scenario.name}.png`);
        await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
        await testInfo.attach(`${name}-${scenario.name}`, { path: screenshot, contentType: 'image/png' });
      }
    } finally { await context.close(); }
  });
}
