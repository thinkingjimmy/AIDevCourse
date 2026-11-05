import type { Locale } from '../../src/lib/i18n/config';
import { localePath } from '../../src/lib/i18n/routing';
import { readCatalog } from '../../src/lib/content/manifest';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

const fixture = process.env.CONTENT_TEST === '1';
const courseSlug = fixture ? 'ai-coding' : 'llm-101';
const coursePath = (locale: string) => localePath(locale as Locale, `/courses/${courseSlug}`);
const lessonPath = (locale = 'zh') => `${coursePath(locale)}/first-change`;

const dictionary = (locale: string) => JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));

async function capture(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

test('model selection follows training and precedes chat', async ({ page: overview }) => {
  test.skip(fixture, 'The lesson belongs to the published Chinese catalog.');
  await overview.setViewportSize({ width: 1440, height: 960 });
  const generation = '/zh/courses/llm-101/what-a-language-model-does';
  const sampling = '/zh/courses/llm-101/why-model-answers-vary';
  const training = '/zh/courses/llm-101/how-language-models-are-trained';
  const probability = '/zh/courses/llm-101/how-models-calculate-token-probabilities';
  const tokens = '/zh/courses/llm-101/what-is-a-token';
  const chat = '/zh/courses/llm-101/how-ai-chat-works';
  const tools = '/zh/courses/llm-101/what-is-a-tool';
  const chatUses = '/zh/courses/llm-101/ai-chat-advice';
  const artifacts = '/zh/courses/llm-101/ai-chat-tips';
  const agents = '/zh/courses/llm-101/what-is-an-agent';
  const selection = '/zh/courses/llm-101/how-to-choose-a-language-model';
  const thinking = '/zh/courses/llm-101/how-model-thinking-works';
  const multimodal = '/zh/courses/llm-101/how-models-see-and-hear';
  const modelBasics = '/zh/courses/llm-101/open-models-and-local-deployment';
  const title = readCatalog().documents.find((document) => document.url === training)!.data.title;
  await overview.goto(coursePath('zh'));
  const links = overview.locator('section[aria-labelledby="course-catalog"] a');
  const order = await links.evaluateAll((elements) => elements.map((element) => element.getAttribute('href')));
  expect(order).toEqual([generation, tokens, sampling, probability, training, thinking, multimodal, modelBasics, selection, chat, tools, chatUses, artifacts, agents]);
  await links.filter({ hasText: title }).click();
  const page = overview;
  await expect(page).toHaveURL(new RegExp(`${training}$`));
  await expect(page.locator('article h1')).toHaveText(title);
  await expect(page.locator('article')).toContainText('模型会先看一段文字，然后预测下一个 Token');
  await expect(page.locator('article')).toContainText('模型的训练数据是有时间限制的');
  await expect(page.locator('[data-achievement="generation-vs-verification"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${training}$`));
  const completion = page.getByRole('button', { name: '标记为已完成', exact: true });
  await expect(page.locator('article > nav')).toHaveCount(0);
  await expect(completion).toBeEnabled();
  await expect(page.locator('article .katex-display')).toHaveCount(0);
  await capture(page, 'model-training-independent-lesson');
  await page.getByRole('button', { name: '01 大语言模型的工作原理', exact: true }).click();
  await page.locator(`.course-navigation a[href="${probability}"]`).click();
  await expect(page).toHaveURL(new RegExp(`${probability}$`));
  await expect(page.locator('article h1')).toHaveText('模型是如何算出 Token 概率的？');
  await expect(page.locator('article h2')).toHaveText(readCatalog().documents.find((document) => document.url === probability)!.headings.filter((heading) => heading.depth === 2).map((heading) => heading.title));
  await expect(page.locator('article .katex-display annotation')).toHaveText('y = ax + b');
  await expect(page.locator('article table')).toHaveCount(3);
  await expect(page.locator('[data-achievement="token-probability-not-truth"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${probability}$`));
  await expect(completion).toBeEnabled();
  await capture(page, 'token-probabilities-independent-lesson');
  await page.locator(`.course-navigation a[href="${sampling}"]`).click();
  await expect(page).toHaveURL(new RegExp(`${sampling}$`));
  await expect(page.locator('article h1')).toHaveText('为什么同样的问题，模型的回答会不同？');
  const headings = readCatalog().documents.find((document) => document.url === sampling)!.headings.filter((heading) => heading.depth === 2).map((heading) => heading.title);
  await expect(page.locator('article h2')).toContainText(headings);
  await expect(page.locator('article table')).toHaveCount(5);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${sampling}$`));
  const toc = page.locator('[data-slot="lesson-toc"] a');
  await expect(toc).toHaveCount(headings.length);
  await toc.last().click();
  await expect(page.locator('article h2').last()).toBeInViewport();
  await capture(page, 'sampling-independent-lesson');
  await test.info().attach('sampling-lesson-sections', { body: JSON.stringify({ headings, anchors: await toc.evaluateAll((links) => links.map((link) => link.getAttribute('href'))) }, null, 2), contentType: 'application/json' });
  await page.locator(`.course-navigation a[href="${tokens}"]`).click();
  await expect(page).toHaveURL(new RegExp(`${tokens}$`));
  await expect(page.locator('article')).toContainText('第一讲，我们提到');
  await page.locator(`.course-navigation a[href="${generation}"]`).click();
  await expect(page).toHaveURL(new RegExp(`${generation}$`));
  await expect(page.locator('article')).not.toContainText('如何进行预训练？');
  await expect(page.locator('article h2').filter({ hasText: '模型是如何训练的？' })).toHaveCount(0);
  await expect(page.locator('article')).not.toContainText('Temperature');
  await expect(page.locator('[data-achievement="generation-vs-verification"]')).toHaveCount(0);
  await expect(page.locator('article h2').filter({ hasText: '搞懂这个概念有什么用？' })).toBeVisible();
  await completion.click();
  await expect(page).toHaveURL(new RegExp(`${tokens}$`));
  await completion.click();
  await expect(page).toHaveURL(new RegExp(`${sampling}$`));
  await completion.click();
  await expect(page).toHaveURL(new RegExp(`${probability}$`));
  await completion.click();
  await expect(page).toHaveURL(new RegExp(`${training}$`));
  await test.info().attach('model-training-lesson-order', { body: JSON.stringify({ title, order }, null, 2), contentType: 'application/json' });
});

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`AI Chat lesson preserves examples and unlocks its achievement on ${viewport.name}`, async ({ page, request }) => {
    test.skip(fixture, 'The lesson belongs to the published Chinese catalog.');
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const chat = '/zh/courses/llm-101/how-ai-chat-works';
    const selection = '/zh/courses/llm-101/how-to-choose-a-language-model';
    const storageKey = 'lac:v1:llm-101:achievement:chat-history-as-input';
    await page.goto(coursePath('zh'));
    const links = page.locator('section[aria-labelledby="course-catalog"] a');
    await expect(links).toHaveCount(14);
    await expect(links.nth(9)).toHaveAttribute('href', chat);
    await expect(links.nth(9)).toContainText('AI Chat 是如何工作的？');
    await page.goto(selection);
    await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${chat}$`));
    await expect(page.locator('article h1')).toHaveText('AI Chat 是如何工作的？');
    await expect(page.locator('article h2')).toContainText(['为什么模型能记住你？', '模型实际收到的内容', '成就挑战']);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${chat}$`));
    const chats = page.locator('article [data-component="chat"]');
    await expect(chats).toHaveCount(3);
    await expect(chats.nth(0).locator('[data-component="chat-message"]')).toHaveText([
      '我叫 Jimmy。你后续的回答都要以 Jimmy 开头。',
      'Jimmy，好的，我记住了。后续每次回答我都会以“Jimmy”开头。请问你想聊什么？',
    ]);
    await expect(chats.nth(1).locator('[data-component="chat-message"]')).toHaveText([
      '今天广州的天气如何？',
      'Jimmy，今天广州天气晴朗，温度在 28 摄氏度。',
    ]);
    await expect(chats.nth(2).locator('[data-component="chat-message"]')).toHaveCount(1);
    await expect(chats.nth(2).locator('[data-component="chat-message"]')).toHaveAttribute('data-from', 'assistant');
    await expect(page.locator('article')).toContainText('模型并不是记住了你，而是它每次都收到了你的所有的历史回复。');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const card = page.locator('[data-achievement="chat-history-as-input"]');
    await expect(card).toContainText('模型是真的记住了你的输入吗？');
    await test.info().attach(`chat-lesson-${viewport.name}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    await card.getByRole('radio').first().click();
    await expect(card).toHaveAttribute('data-state', 'incorrect');
    await card.getByRole('radio').last().click();
    await expect(card).toHaveAttribute('data-state', 'unlocked');
    await page.reload();
    await expect(card).toHaveAttribute('data-state', 'unlocked');
    expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).not.toBeNull();
    await expect(page.getByRole('button', { name: '标记为已完成', exact: true })).toBeEnabled();
    const accessibility = await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(await (await request.get('/sitemap.xml')).text()).toContain(chat);
    await test.info().attach(`chat-achievement-${viewport.name}`, { body: await card.screenshot(), contentType: 'image/png' });
  });
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }, { name: 'narrow', width: 320, height: 844 }]) {
  test(`brand identity stays consistent on ${viewport.name}`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const checkBrand = async () => {
      const logo = page.getByRole('link', { name: /^AIDevCourse(?: · |$)/ }).first();
      await expect(logo).toBeVisible();
      const mark = logo.locator('[data-slot="brand-mark"]');
      await expect(mark).toHaveAttribute('src', '/images/brand/logo.svg');
      await expect(mark).toHaveAttribute('alt', 'AIDevCourse');
      await expect.poll(() => mark.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 256 && image.naturalHeight === 256)).toBe(true);
      const bounds = (await mark.boundingBox())!;
      expect(bounds.width).toBeCloseTo(bounds.height, 1);
      expect(bounds.height).toBeGreaterThanOrEqual(35);
      expect((await logo.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(page).toHaveTitle(/AIDevCourse/);
      await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    };
    for (const locale of ['zh', 'en', 'ja', 'fr', 'es']) {
      await page.goto(localePath(locale as Locale, `/`));
      await checkBrand();
      await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'AIDevCourse');
      await page.goto(localePath(locale as Locale, `/about`));
      await checkBrand();
      await expect(page.locator('main')).toContainText('AIDevCourse');
    }
    await page.goto('/zh');
    await capture(page, `brand-home-${viewport.name}`);
    await page.goto(coursePath('zh'));
    await checkBrand();
    await page.getByRole('link', { name: /^AIDevCourse · / }).click();
    await expect(page).toHaveURL(/\/zh$/);
    for (const path of ['/unknown-brand-page', '/zh/unknown-brand-page', '/design/a']) {
      await page.goto(path);
      await checkBrand();
    }
    const favicon = await request.get('/favicon.svg');
    expect(favicon.ok()).toBe(true);
    const faviconSource = await favicon.text();
    expect(faviconSource).toContain('id="scanline-a"');
    expect(faviconSource).not.toContain('<image');
    expect(faviconSource).not.toContain('invert(');
    expect(await page.evaluate(async () => {
      const image = new Image();
      image.src = '/favicon.svg';
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    })).toEqual([64, 64]);
    const touchIcon = await request.get('/images/brand/apple-touch-icon.png');
    expect(touchIcon.ok()).toBe(true);
    expect(touchIcon.headers()['content-type']).toContain('image/png');
    const course = readCatalog().courses.find((item) => item.locale === 'zh' && item.slug === courseSlug)!;
    await page.goto(course.lessons[0].url);
    if (viewport.width < 961) {
      await page.locator('[data-slot="mobile-course-navigation"]').getByRole('link', { name: dictionary('zh').Ui.home, exact: true }).click();
      await expect(page).toHaveURL(/\/zh$/);
      await checkBrand();
    } else await checkBrand();
    await capture(page, `${viewport.width < 961 ? 'brand-return-home' : 'brand-sidebar'}-${viewport.name}`);
  });
}

for (const width of [1440, 320, 390]) {
  test(`flat course sidebar and compact footer at ${width}px`, async ({ page }) => {
    const course = readCatalog().courses.find((item) => item.locale === 'zh' && item.slug === courseSlug)!;
    const copy = dictionary('zh');
    await page.setViewportSize({ width, height: 960 });
    await page.goto(course.lessons[0].url);
    if (width < 961) await page.getByRole('button', { name: copy.Ui.menu, exact: true }).click();
    const sidebar = page.locator(width < 961 ? '[data-mobile="true"]' : '[data-slot="sidebar-inner"]');
    const moduleToggle = sidebar.locator('[data-sidebar="menu-button"]').first();
    await expect(moduleToggle).toHaveText(`01 ${course.lessons[0].moduleTitle}`);
    await expect(moduleToggle.locator('svg')).toHaveCount(1);
    const lessons = sidebar.locator('[data-sidebar="menu-sub-button"]');
    const firstGroup = course.lessons.filter((lesson) => lesson.module === course.lessons[0].module);
    await expect(lessons).toHaveText(firstGroup.map((lesson, index) => `1.${index + 1} ${lesson.title}`));
    await expect(lessons.first()).toHaveAttribute('aria-current', 'page');
    const layout = await sidebar.evaluate((element) => {
      const moduleBounds = element.querySelector('[data-sidebar="menu-button"]')!.getBoundingClientRect();
      const lesson = element.querySelector('[data-sidebar="menu-sub-button"]')!.getBoundingClientRect();
      const title = element.querySelector('[data-sidebar="menu-sub-button"] > span:last-child')!.getBoundingClientRect();
      const moduleNumber = element.querySelector('[data-sidebar="menu-button"] > span:first-of-type')!.getBoundingClientRect();
      const lessonNumber = element.querySelector('[data-sidebar="menu-sub-button"] > span:first-child')!.getBoundingClientRect();
      const footer = element.querySelector('[data-sidebar="footer"]')!;
      const buttons = [...footer.querySelectorAll('button')].map((button) => button.getBoundingClientRect().height);
      const style = getComputedStyle(footer);
      return { moduleLeft: moduleBounds.left, lessonLeft: lesson.left, titleLeft: title.left, moduleNumberLeft: moduleNumber.left, lessonNumberLeft: lessonNumber.left, footerHeight: footer.getBoundingClientRect().height, paddingTop: style.paddingTop, paddingBottom: style.paddingBottom, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight, buttons };
    });
    expect(layout.lessonLeft).toBeCloseTo(layout.moduleLeft, 1);
    expect(layout.titleLeft - layout.lessonLeft).toBe(width < 961 ? 44 : 56);
    expect(layout.lessonNumberLeft).toBeCloseTo(layout.moduleNumberLeft, 1);
    expect(layout.buttons).toEqual([44]);
    expect(layout.paddingTop).toBe('8px');
    expect(layout.paddingBottom).toBe(width < 961 ? '12px' : '8px');
    expect(layout.paddingLeft).toBe(width < 961 ? '16px' : '8px');
    expect(layout.paddingRight).toBe(width < 961 ? '16px' : '8px');
    expect(layout.footerHeight).toBe(width < 961 ? 65 : 61);
    const navigationSpacing = await sidebar.evaluate((element) => {
      const header = element.querySelector('[data-sidebar="header"]')!;
      const group = element.querySelector('[data-sidebar="group"]')!;
      const groupBox = group.getBoundingClientRect();
      const rows = [...group.querySelectorAll('[data-sidebar="menu-button"], [data-sidebar="menu-sub-button"]')];
      const padding = (item: Element) => {
        const style = getComputedStyle(item);
        return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
      };
      const trigger = header.querySelector('[data-sidebar="trigger"]')!;
      const triggerBox = trigger.getBoundingClientRect();
      const iconBox = trigger.querySelector('svg')!.getBoundingClientRect();
      return {
        header: padding(header), navigation: padding(group), courseTitle: padding(element.querySelector('a')!),
        rows: rows.map((row) => {
          const box = row.getBoundingClientRect();
          return { lesson: row.matches('[data-sidebar="menu-sub-button"]'), padding: padding(row), outside: [box.left - groupBox.left, groupBox.right - box.right] };
        }),
        toggle: [iconBox.left - triggerBox.left, iconBox.top - triggerBox.top, triggerBox.right - iconBox.right, triggerBox.bottom - iconBox.bottom],
      };
    });
    expect(navigationSpacing.header).toEqual(width < 961 ? ['4px', '20px', '8px', '20px'] : ['8px', '8px', '8px', '8px']);
    expect(navigationSpacing.navigation).toEqual(width < 961 ? ['8px', '16px', '16px', '16px'] : ['8px', '8px', '8px', '8px']);
    expect(navigationSpacing.courseTitle).toEqual(['8px', '8px', '8px', width < 961 ? '8px' : '20px']);
    for (const inset of navigationSpacing.toggle) expect(inset).toBeCloseTo(width < 961 ? 12 : 8, 1);
    for (const row of navigationSpacing.rows) {
      expect(row.padding).toEqual(['8px', '8px', '8px', width < 961 ? '8px' : '20px']);
      expect(row.outside).toEqual(width < 961 ? [16, 16] : [8, 8]);
    }
    await moduleToggle.hover();
    await lessons.nth(1).hover();
    const sidebarBox = (await sidebar.boundingBox())!;
    const navigationBox = (await sidebar.locator('[data-sidebar="group"]').boundingBox())!;
    const navigationCapture = test.info().outputPath(`sidebar-top-hover-${width}.png`);
    await page.screenshot({ path: navigationCapture, clip: { x: sidebarBox.x, y: sidebarBox.y, width: sidebarBox.width, height: navigationBox.y + navigationBox.height - sidebarBox.y } });
    await test.info().attach('sidebar-top-hover', { path: navigationCapture, contentType: 'image/png' });
    await test.info().attach('sidebar-top-spacing', { body: JSON.stringify(navigationSpacing, null, 2), contentType: 'application/json' });
    await moduleToggle.press('Enter');
    await expect(moduleToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(lessons).toHaveCount(0);
    await moduleToggle.press('Enter');
    await expect(lessons.first()).toBeVisible();
    await expect(sidebar.getByRole('button', { name: copy.Language.label, exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const achievements = sidebar.getByRole('button', { name: copy.Course.achievementsTitle, exact: true });
    await sidebar.locator('[data-sidebar="footer"]').click({ position: { x: 4, y: 4 } });
    await achievements.hover();
    const hoverSpacing = await achievements.evaluate((element) => {
      const footer = element.closest('[data-sidebar="footer"]')!;
      const footerBox = footer.getBoundingClientRect();
      const buttonBox = element.getBoundingClientRect();
      const ringBox = element.querySelector('[role="progressbar"]')!.getBoundingClientRect();
      const textBox = element.querySelector('[data-achievement-count]')!.parentElement!.getBoundingClientRect();
      return {
        radius: getComputedStyle(element).borderRadius,
        outside: [buttonBox.left - footerBox.left, buttonBox.top - footerBox.top - parseFloat(getComputedStyle(footer).borderTopWidth), footerBox.bottom - buttonBox.bottom, footerBox.right - buttonBox.right],
        ringInsets: [ringBox.left - buttonBox.left, ringBox.top - buttonBox.top, buttonBox.bottom - ringBox.bottom],
        textInsets: [textBox.top - buttonBox.top, buttonBox.bottom - textBox.bottom, buttonBox.right - textBox.right],
      };
    });
    expect(hoverSpacing.outside).toEqual(width < 961 ? [16, 8, 12, 16] : [8, 8, 8, 8]);
    expect(hoverSpacing.ringInsets).toEqual([8, 8, 8]);
    expect(hoverSpacing.textInsets).toEqual([8, 8, 8]);
    expect(hoverSpacing.radius).not.toBe('0px');
    await expect(sidebar.locator('[data-slot="author-dialog-trigger"]')).toHaveCount(0);
    const footerCapture = test.info().outputPath(`footer-hover-${width}.png`);
    await sidebar.locator('[data-sidebar="footer"]').screenshot({ path: footerCapture });
    await test.info().attach('footer-hover', { path: footerCapture, contentType: 'image/png' });
    await test.info().attach('footer-hover-spacing', { body: JSON.stringify(hoverSpacing, null, 2), contentType: 'application/json' });
    await capture(page, `flat-sidebar-compact-footer-${width}`);
    await test.info().attach('sidebar-layout', { body: JSON.stringify(layout, null, 2), contentType: 'application/json' });
    if (width >= 961) {
      const toggle = sidebar.locator('[data-sidebar="trigger"]');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      const collapsedInsets = await toggle.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const icon = element.querySelector('svg')!.getBoundingClientRect();
        return [icon.left - box.left, icon.top - box.top, box.right - icon.right, box.bottom - icon.bottom];
      });
      expect(collapsedInsets).toEqual([8, 8, 8, 8]);
      await toggle.click();
      await expect(lessons.first()).toBeVisible();
    }
  });
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`course overview preserves hero layout and the localized footer on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const locale of ['zh', 'en', 'ja', 'fr', 'es']) {
      const copy = dictionary(locale);
      await page.goto(coursePath(locale));
      await page.evaluate(() => document.fonts.ready);
      const title = page.locator('main h1');
      const hero = title.locator('..');
      const action = page.getByRole('link', { name: copy.Course.startFirst, exact: true });
      expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(viewport.width < 721 ? 48 : 44);
      await expect(action.locator('[data-slot="hero-primary-face"]')).toHaveCSS('background-color', 'rgb(9, 9, 11)');
      await expect(action.locator('..').locator('p')).toHaveCount(0);
      await expect(action).not.toHaveAttribute('target', '_blank');
      const contentLeft = (await title.boundingBox())!.x;
      for (const element of [title, hero.locator(':scope > p').first(), hero.locator(':scope > p').last(), action, page.locator('#course-catalog')]) {
        expect((await element.boundingBox())!.x).toBeCloseTo(contentLeft, 1);
      }
      if (locale === 'en' || locale === 'zh') await capture(page, `${locale}-course-hero-${viewport.name}`);
      const footer = page.getByRole('contentinfo');
      await expect(footer).toHaveCount(1);
      await expect(footer).toContainText(dictionary(locale).Home.footerLead);
      await expect(footer).toContainText(dictionary(locale).Home.footerMeta);
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await capture(page, `${locale}-course-footer-${viewport.name}`);
    }
    if (!fixture) return;
    await page.goto(lessonPath());
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    const homeLink = page.getByRole('banner').getByRole('link', { name: /^AIDevCourse · / });
    await expect(homeLink).toHaveCount(1);
    await homeLink.click();
    await page.locator(`[data-slot="course-grid"] a[href="${coursePath('zh')}"]`).click();
    await expect(page.getByRole('contentinfo')).toContainText(dictionary('zh').Home.footerLead);
  });
}

test('search uses shortcuts without header or sidebar buttons', async ({ page }) => {
  const copy = dictionary('zh');
  for (const path of ['/zh', coursePath('zh'), ...(fixture ? [lessonPath()] : [])]) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: copy.Search.open, exact: true })).toHaveCount(0);
    const language = page.getByRole('button', { name: copy.Language.label, exact: true }).or(page.locator('.language-picker summary'));
    await language.focus();
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('textbox', { name: copy.Search.open })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(language).toBeFocused();
    await capture(page, path.endsWith('first-change') ? 'sidebar-without-search-entry' : path === '/zh' ? 'header-without-search-entry' : 'course-without-search-entry');
  }
  if (!fixture) return;
  const toggle = page.locator('[data-slot="sidebar-trigger"]');
  await toggle.click();
  await page.keyboard.press('Meta+k');
  await expect(page.getByRole('textbox', { name: copy.Search.open })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(lessonPath());
  await page.getByRole('button', { name: copy.Ui.menu, exact: true }).click();
  const close = page.locator('[data-mobile="true"] [data-sidebar="trigger"]');
  await close.focus();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('textbox', { name: copy.Search.open })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(close).toBeFocused();
  await expect(page.locator('[data-mobile="true"]')).toBeVisible();
  await capture(page, 'mobile-sidebar-without-search-entry');
});

async function openLanguages(page: Page, locale: string) {
  const trigger = page.getByRole('banner').locator('.language-picker summary');
  await expect(trigger).toHaveAccessibleName(dictionary(locale).Language.label);
  await expect(trigger).toHaveText('🌐');
  await expect(trigger.locator('svg')).toHaveCount(0);
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.locator('.language-options');
  await expect(menu).toBeVisible();
  await expect(menu.locator('a')).toHaveCount(5);
  await expect(menu.locator('a[aria-current="true"]')).toHaveAttribute('hreflang', locale === 'zh' ? 'zh-Hans' : locale);
  const box = await menu.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThan(230);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  return menu.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: style.width, border: style.border, shadow: style.boxShadow, color: style.color, font: style.font };
  });
}

for (const locale of ['zh', 'en', 'ja', 'fr', 'es']) {
  test(`${locale}: navigation shares a compact globe language menu`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(localePath(locale as Locale, `/`));
    await page.evaluate(() => document.fonts.ready);
    const header = await openLanguages(page, locale);
    await capture(page, `${locale}-header-languages`);
    await page.keyboard.press('Escape');
    await expect(page.locator('.language-picker summary')).toBeFocused();
    await expect(page.locator('.language-options')).not.toBeVisible();
    await page.goto(fixture ? lessonPath(locale) : coursePath(locale));
    await page.evaluate(() => document.fonts.ready);
    const courseMenu = await openLanguages(page, locale);
    if (!fixture) expect(courseMenu).toEqual(header);
    await expect(page.locator('svg.lucide')).toHaveCount(0);
    await capture(page, `${locale}-sidebar-languages`);
    await page.locator('main h1, article h1').click();
    await expect(page.locator('.language-options')).not.toBeVisible();
  });
}

test('sidebar collapse preserves focus, reading space, and navigation state', async ({ page }) => {
  test.skip(!fixture, 'Lesson controls use the isolated fixture build.');
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(lessonPath());
  const sidebar = page.locator('[data-slot="sidebar"][data-state]');
  const toggle = page.locator('[data-slot="sidebar-trigger"]');
  const modules = page.locator('[data-sidebar="menu-button"]');
  if (await modules.first().getAttribute('aria-expanded') !== 'true') await modules.first().click();
  await expect(toggle).toHaveAccessibleName(dictionary('zh').Ui.collapseSidebar);
  const courseTitle = await page.locator('[data-slot="sidebar-header"] a').first().boundingBox();
  const button = await toggle.boundingBox();
  expect(button!.x).toBeGreaterThan(courseTitle!.x + courseTitle!.width);
  await toggle.click();
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAccessibleName(dictionary('zh').Ui.expandSidebar);
  await expect(toggle).toBeFocused();
  await expect(page.locator('.course-navigation')).not.toBeVisible();
  await expect(page.getByRole('button', { name: dictionary('zh').Language.label, exact: true })).not.toBeVisible();
  await expect.poll(async () => (await page.locator('[data-slot="sidebar-container"]').boundingBox())!.width).toBe(48);
  await expect(page.locator('article > .prose')).toBeVisible();
  const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(report.violations).toEqual([]);
  await capture(page, 'sidebar-collapsed');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.closest('[data-slot="sidebar-inner"]') === null)).toBe(true);
  await page.keyboard.press('Control+b');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(modules.first()).toHaveAttribute('aria-expanded', 'true');
  await capture(page, 'sidebar-expanded');
  await toggle.click();
  await page.getByRole('button', { name: dictionary('zh').Ui.markComplete, exact: true }).click();
  await expect(page).not.toHaveURL(/\/first-change$/);
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(page.locator('.course-navigation')).toBeVisible();
  await modules.first().focus();
  await page.keyboard.press('Control+b');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('heading links use Phosphor icons and report successful copying', async ({ page, context, browserName }) => {
  test.skip(!fixture, 'Lesson controls use the isolated fixture build.');
  test.skip(browserName !== 'chromium', 'Native clipboard permission checks use Chromium.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(lessonPath());
  const heading = page.locator('.prose h2[id]').first();
  const button = heading.getByRole('button', { name: dictionary('zh').Ui.copyAnchor });
  await expect(button.locator('svg')).toHaveAttribute('viewBox', '0 0 256 256');
  await button.focus();
  await button.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: dictionary('zh').Ui.copied })).toBeAttached();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const expected = new URL(page.url());
  expected.hash = (await heading.getAttribute('id'))!;
  expect(copied).toBe(expected.href);
  await expect(page.locator('svg.lucide')).toHaveCount(0);
  await capture(page, 'phosphor-heading-link');
});

test('mobile sidebar closes from its title row and header language choices fit the viewport', async ({ page }) => {
  test.skip(!fixture, 'Lesson controls use the isolated fixture build.');
  const copy = dictionary('zh');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 960]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(lessonPath());
    const menuButton = page.getByRole('button', { name: copy.Ui.menu, exact: true });
    await menuButton.click();
    const sheet = page.locator('[data-mobile="true"]');
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAccessibleName(copy.Ui.menu);
    await expect(sheet.locator('img, .language-picker')).toHaveCount(0);
    await sheet.getByRole('button', { name: copy.Ui.close, exact: true }).click();
    await expect(sheet).toHaveCount(0);
    await expect(menuButton).toBeFocused();
    await openLanguages(page, 'zh');
    await capture(page, `mobile-languages-${width}`);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('banner').locator('.language-picker summary')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: copy.Ui.menu, exact: true }).click();
  await page.getByRole('button', { name: copy.Language.label, exact: true }).click();
  await page.locator('.language-options a[hreflang="en"]').click();
  await expect(page).toHaveURL(/\/courses\/ai-coding\/first-change$/);
  await page.getByRole('button', { name: dictionary('en').Ui.menu, exact: true }).click();
  await page.locator('[data-mobile="true"] a[href="/courses/ai-coding/useful-context"]').click();
  await expect(page).toHaveURL(/\/useful-context$/);
  await expect(page.locator('[data-mobile="true"]')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/first-change$/);
  await expect(page.locator('[data-mobile="true"]')).toHaveCount(0);
});

test('navigation remains usable when session storage and clipboard access fail', async ({ page }) => {
  test.skip(!fixture, 'Lesson controls use the isolated fixture build.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) } });
  });
  await page.goto(lessonPath());
  const toggle = page.locator('[data-slot="sidebar-trigger"]');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: dictionary('zh').Ui.markComplete, exact: true }).click();
  await expect(page).not.toHaveURL(/\/first-change$/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(page.locator('.course-navigation')).toBeVisible();
  await page.locator(`.course-navigation a[href="${lessonPath()}"]`).click();
  await expect(page).toHaveURL(/\/first-change$/);
  await page.getByRole('button', { name: dictionary('zh').Ui.copyAnchor, exact: true }).first().click();
  await expect(page.getByRole('status').filter({ hasText: dictionary('zh').Ui.copyAnchorFailed })).toBeAttached();
  await expect(page.locator('article > .prose')).toBeVisible();
  expect(errors).toEqual([]);
  await capture(page, 'navigation-storage-and-clipboard-failure');
});
