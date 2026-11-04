import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectAssembled, expectStill } from '../illustrations/poses';

const title = '从想法到作品';
const url = '/zh/courses/ai-coding';
const lessonUrl = `${url}/about-this-course`;
const artwork = (figure: Locator) => figure.locator('.iso-fill').evaluateAll(elements => elements.map(element => element.getAttribute('d')));

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published introduction course.');

for (const scenario of [
  { name: 'desktop', width: 1440, javaScriptEnabled: true },
  { name: 'phone', width: 390, javaScriptEnabled: true },
  { name: 'narrow phone', width: 320, javaScriptEnabled: true },
  { name: 'without JavaScript', width: 320, javaScriptEnabled: false },
]) {
  test(`introduction course opens from its own section on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 960 },
      javaScriptEnabled: scenario.javaScriptEnabled, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/zh');
      await expect(page.locator('#catalog h2')).toHaveText(['开始之前', '入门', '中级']);
      const introduction = page.getByRole('region', { name: '开始之前', exact: true });
      const card = introduction.getByRole('link', { name: title, exact: true });
      await expect(introduction.getByRole('heading', { level: 3 })).toHaveText(title);
      await expect(card).toHaveAttribute('href', url);
      await expect(card).toContainText('开始之前 · 免费');
      await expect(page.getByRole('region', { name: '入门', exact: true }).getByRole('heading', { level: 3 })).toHaveText(['LLM 101', 'Coding 101', '设计 101']);
      await expect(page.locator('[data-slot="hero-primary-action"]')).toHaveAttribute('href', '/zh/courses/llm-101/what-a-language-model-does');
      const hero = page.locator('[data-slot="home-hero-art"] [data-anatomy="mac"]');
      const figure = card.locator('[data-anatomy="mac"]');
      await expect(figure).toBeVisible();
      const homeArtwork = await artwork(hero);
      expect(homeArtwork.length).toBeGreaterThan(0);
      expect(await artwork(figure)).toEqual(homeArtwork);
      const clips = await page.locator('[data-anatomy="mac"] svg').evaluateAll(elements => elements.map(svg => {
        const ids = [...svg.querySelectorAll('[id]')].map(element => element.id);
        const references = [...svg.querySelectorAll('[clip-path]')].map(element => element.getAttribute('clip-path')!.slice(5, -1));
        return { ids, references };
      }));
      expect(clips).toHaveLength(2);
      const ids = clips.flatMap(clip => clip.ids);
      expect(new Set(ids).size).toBe(ids.length);
      for (const clip of clips) for (const reference of clip.references) expect(clip.ids).toContain(reference);
      const frame = (await card.locator('[data-slot="course-card-art"]').boundingBox())!;
      const image = (await card.locator('[data-slot="course-card-image"]').boundingBox())!;
      expect(frame.width / frame.height).toBeCloseTo(450.06 / 515.9, 2);
      expect(frame.x).toBeGreaterThanOrEqual(image.x);
      expect(frame.x + frame.width).toBeLessThanOrEqual(image.x + image.width);
      expect(frame.y).toBeGreaterThanOrEqual(image.y);
      expect(frame.y + frame.height).toBeLessThanOrEqual(image.y + image.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach('Introduction homepage', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
      await card.focus();
      await card.press('Enter');
      await expect(page).toHaveURL(url);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page).toHaveTitle(new RegExp(title));
      await expect(page.locator('[data-slot="course-hero"]')).toContainText('开始之前');
      await expect(page.locator('[data-slot="course-empty"]')).toHaveCount(0);
      await expect(page.getByRole('link', { name: '开始第一课', exact: true })).toHaveAttribute('href', lessonUrl);
      await expect(page.locator('#course-catalog').locator('..').getByRole('link', { name: '1.1 关于这门课', exact: true })).toHaveAttribute('href', lessonUrl);
      const courseFigure = page.locator('[data-anatomy="mac"]');
      expect(await artwork(courseFigure)).toEqual(homeArtwork);
      if (scenario.width >= 841) await expect(courseFigure).toBeVisible();
      else await expect(courseFigure).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      if (scenario.javaScriptEnabled) {
        const accessibility = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
      await testInfo.attach('Introduction overview', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
      await testInfo.attach('Introduction artwork geometry', { body: JSON.stringify({ frame, image, clips }, null, 2), contentType: 'application/json' });
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await page.getByRole('link', { name: '开始第一课', exact: true }).click();
      await expect(page).toHaveURL(lessonUrl);
      await expect(page.locator('article h1')).toHaveText('关于这门课');
      await expect(page.locator('article > .prose')).toContainText('理解 AI，学会与它协作，把自己的想法做出来。');
      await expect(page.locator('article > .prose').getByRole('link', { name: 'LLM 101', exact: true })).toHaveAttribute('href', '/zh/courses/llm-101');
      await expect(page.locator('article > .prose').getByRole('link', { name: 'Coding 101', exact: true })).toHaveAttribute('href', '/zh/courses/coding-101');
      await expect(page.locator('article > .prose').getByRole('link', { name: 'Agent 101', exact: true })).toHaveAttribute('href', '/zh/courses/agent-101');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach('About this course lesson', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
      await page.getByRole('banner').locator('a[href="/zh"]').click();
      await expect(card).toBeVisible();
    } finally { await context.close(); }
  });
}

test('untranslated introduction sections stay hidden', async ({ page }, testInfo) => {
  for (const path of ['/', '/ja', '/fr', '/es']) {
    await page.goto(path);
    await expect(page.locator('#courses-introduction')).toHaveCount(0);
    await expect(page.locator('#catalog h2')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'LLM 101', exact: true })).toBeVisible();
  }
  await testInfo.attach('Untranslated homepage', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('introduction Mac animates independently and honors reduced motion', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/zh');
  const home = page.locator('[data-slot="home-hero-art"] [data-anatomy="mac"]');
  const card = page.getByRole('link', { name: title, exact: true });
  const figure = card.locator('[data-anatomy="mac"]');
  const keyboard = figure.locator('[data-asm="kb"]');
  await expect(home).toHaveAttribute('data-settled', 'true');
  await card.scrollIntoViewIfNeeded();
  await expectAssembled(figure);
  await expectStill(figure);
  await testInfo.attach('Assembled introduction card', { body: await card.screenshot(), contentType: 'image/png' });
  const homeKeyboard = await home.locator('[data-asm="kb"]').getAttribute('transform');
  await card.hover();
  await expect(figure).toHaveAttribute('data-settled', 'true');
  await expect(keyboard).toHaveAttribute('transform', /translate/);
  await expectStill(figure);
  expect(await home.locator('[data-asm="kb"]').getAttribute('transform')).toBe(homeKeyboard);
  await testInfo.attach('Expanded introduction card', { body: await card.screenshot(), contentType: 'image/png' });
  await page.mouse.move(0, 0);
  await expectAssembled(figure);
  await card.click();
  await expect(page).toHaveURL(url);
  const hero = page.locator('[data-anatomy="mac"]');
  await expect(hero).toHaveAttribute('data-settled', 'true');
  await hero.hover();
  await expect(hero).toHaveAttribute('data-settled', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(hero).toHaveAttribute('data-settled', 'true');
  expect(await hero.evaluate(element => new Promise<number>(resolve => {
    let changes = 0;
    const observer = new MutationObserver(records => { changes += records.length; });
    observer.observe(element, { subtree: true, attributes: true, attributeFilter: ['transform'] });
    setTimeout(() => { observer.disconnect(); resolve(changes); }, 700);
  }))).toBe(0);
  await testInfo.attach('Reduced motion introduction', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});
