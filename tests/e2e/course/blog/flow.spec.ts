import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published blog course.');

const course = '/zh/courses/blog';
const lessons = [
  {
    slug: 'no-loyalty-to-ai-coding-tools',
    title: '没人对 AI 编程工具有忠诚度：聊聊 2026 年 Stack Overflow 开发者调查',
    opening: '又到年底了，各大分析机构陆续发布与 AI 相关的 2026 年终总结。',
    closing: '此处我也分享下我的实际感受：',
    notes: [
      { id: 'survey-sample', text: '这里我要再次 callback 一下问卷样本' },
      { id: 'satisfaction', text: '我个人的理解这一方面是受访人' },
      { id: 'production-workflows', text: '我认为这个数据与我的使用情况匹配' },
      { id: 'career-impact', text: '当年珍妮纺织机在英国普及用了近 20 年' },
      { id: 'tool-switching', text: '为何是暂时领跑？' },
      { id: 'personal-experience', text: '此处我也分享下我的实际感受：' },
    ],
    images: ['001.png', '002.png', '003.png', '004.png'],
  },
  {
    slug: 'enterprise-ai-adoption-roi',
    title: '用 AI 的 ROI 不一定高，但老板们的自信肯定上来了 —— 从 Wharton、KPMG 与 Pax8 报告看企业 AI 落地现状',
    opening: '上一篇分享了开发者视角的 AI 数据，今天换个角度，聊聊企业端的真实情况。或许对正在做产品的开发者或创业的朋友有帮助。',
    closing: '数据控制我觉得是企业的头号需求，复核则是被低估的隐形成本。未来会如何演进？我觉得兜兜转转之后，未来企业级 AI 或许又会重演历史，走回到私有化部署 + 自动化护栏监控（Automated Monitoring）的地步？',
    notes: [
      { id: 'shadow-ai', text: '很可惜 KPMG 没有问大企业影子 AI 的情况' },
      { id: 'build-or-buy', text: '其实关于这个问题，我也比较疑惑。' },
      { id: 'measuring-roi', text: '正如我前面提到那样' },
      { id: 'data-control', text: '数据控制我觉得是企业的头号需求' },
    ],
    images: [],
  },
];
const digest = (body: Buffer) => createHash('sha256').update(body).digest('hex');

for (const scenario of [
  { name: 'desktop', width: 1536, javaScriptEnabled: true },
  { name: 'phone', width: 390, javaScriptEnabled: true },
  { name: 'narrow phone', width: 320, javaScriptEnabled: true },
  { name: 'without JavaScript', width: 390, javaScriptEnabled: false },
]) {
  test(`blog opens both complete articles on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 960 },
      javaScriptEnabled: scenario.javaScriptEnabled, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      const evidence = [];
      const capture = async (name: string) => {
        const path = testInfo.outputPath(`${name}.png`);
        await page.screenshot({ path, animations: 'disabled' });
        await testInfo.attach(name, { path, contentType: 'image/png' });
      };
      await page.goto('/zh?view=resources');
      const resources = page.getByRole('region', { name: '学习资料', exact: true });
      const card = resources.getByRole('link', { name: '博客', exact: true });
      await expect(card).toHaveAttribute('href', course);
      await expect(card.locator('.optical-disc-meta')).toHaveText('2 篇文章');
      await expect(page.locator('[data-slot="hero-primary-action"]')).toHaveAttribute('href', '/zh/courses/getting-started');
      await card.focus();
      await card.press('Enter');
      await expect(page).toHaveURL(course);
      await expect(page.locator('main h1')).toHaveText('博客');
      const entries = page.locator('section[aria-labelledby="course-catalog"] ol a');
      await expect(entries).toHaveCount(2);
      for (const [index, lesson] of lessons.entries()) {
        await expect(entries.nth(index)).toHaveAttribute('href', `${course}/${lesson.slug}`);
        await expect(entries.nth(index)).toContainText(lesson.title);
      }
      await capture('blog-directory');
      await page.getByRole('link', { name: '开始第一课', exact: true }).click();

      for (const [index, lesson] of lessons.entries()) {
        await expect(page).toHaveURL(`${course}/${lesson.slug}`);
        await expect(page.locator('article h1')).toHaveText(lesson.title);
        const article = page.locator('article > .prose');
        await expect(article).toContainText(lesson.opening);
        await expect(article.locator('h2')).toHaveCount(5);
        await expect(article.locator('[data-jimmy-note-anchor]')).toHaveCount(lesson.notes.length);
        await expect(article.locator('[role="note"][data-type]')).toHaveCount(0);
        const images = article.locator('img[alt]:not([alt=""])');
        await expect(images).toHaveCount(lesson.images.length);
        for (const [imageIndex, filename] of lesson.images.entries()) {
          const source = `/images/writing/no-loyalty-to-ai-coding-tools/${filename}`;
          const image = images.nth(imageIndex);
          const imageUrl = new URL((await image.getAttribute('src'))!, baseURL);
          const original = imageUrl.pathname === '/_next/image' ? imageUrl.searchParams.get('url') : imageUrl.pathname;
          expect(original).toMatch(/^\/(?:images\/|_next\/static\/media\/)/);
          await expect(image).toHaveAttribute('alt', /\S+/);
          await image.scrollIntoViewIfNeeded();
          await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
          const response = await context.request.get(original!);
          expect(response.ok()).toBe(true);
          expect(digest(await response.body())).toBe(digest(readFileSync(`public${source}`)));
        }
        const scope = page.locator('[data-slot="lesson-reading-group"]');
        if (scenario.javaScriptEnabled) {
          await expect(scope).toHaveAttribute('data-note-mode', scenario.width >= 1536 ? 'rail' : 'popover');
        }
        const rail = scenario.javaScriptEnabled && scenario.width >= 1536;
        for (const [noteIndex, authored] of lesson.notes.entries()) {
          const trigger = article.locator(`[data-note-trigger-for="${authored.id}"]`);
          const note = rail ? page.locator(`[data-jimmy-note-card="${authored.id}"] [data-component="jimmy-note"]`)
            : scenario.javaScriptEnabled ? page.locator('[data-slot="jimmy-note-popover"] [data-component="jimmy-note"]')
              : article.locator(`noscript #jimmy-note-${authored.id}`);
          if (rail) {
            await expect(trigger).toBeHidden();
            await article.locator(`[data-jimmy-note-anchor="${authored.id}"]`).evaluate(element => element.scrollIntoView({ block: 'center' }));
            await expect(page.locator(`[data-note-connector="${authored.id}"]`)).toHaveAttribute('d', /^M /);
          } else if (scenario.javaScriptEnabled) {
            await expect(trigger).toBeEnabled();
            await expect(trigger).toHaveAccessibleName(`查看 Jimmy 的批注 ${noteIndex + 1}`);
            await trigger.scrollIntoViewIfNeeded();
            await trigger.press('Enter');
            const dialog = page.getByRole('dialog', { name: 'Jimmy 的批注', exact: true });
            await expect(dialog).toBeVisible();
            await expect(async () => {
              const bounds = (await dialog.boundingBox())!;
              expect(bounds.x).toBeGreaterThanOrEqual(15);
              expect(bounds.x + bounds.width).toBeLessThanOrEqual(scenario.width - 15);
              expect(bounds.y).toBeGreaterThanOrEqual(15);
              expect(bounds.y + bounds.height).toBeLessThanOrEqual(945);
            }).toPass({ timeout: 5000 });
          } else {
            await expect(trigger).toBeHidden();
            await note.scrollIntoViewIfNeeded();
          }
          await expect(note).toBeVisible();
          await expect(note).toContainText(authored.text);
          await expect(note.locator('[data-slot="note-signature"]')).toContainText('Jimmy');
          if (noteIndex === lesson.notes.length - 1) await expect(note).toContainText(lesson.closing);
          if (authored.id === 'measuring-roi' && scenario.javaScriptEnabled && !rail) {
            expect(await note.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
            await note.evaluate(element => { element.scrollTop = element.scrollHeight; });
            await expect(note.locator('[data-slot="note-body"] > p').last()).toBeInViewport();
          }
          if (noteIndex === 0 || noteIndex === lesson.notes.length - 1 || authored.id === 'measuring-roi') {
            if (scenario.javaScriptEnabled && !rail) {
              expect((await new AxeBuilder({ page }).include('[data-slot="jimmy-note-popover"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
            }
            await capture(`${lesson.slug}-${authored.id}`);
          }
          if (scenario.javaScriptEnabled && !rail) {
            await page.keyboard.press('Escape');
            await expect(page.locator('[data-slot="jimmy-note-popover"]')).toHaveCount(0);
            await expect(trigger).toBeFocused();
          }
        }
        if (scenario.javaScriptEnabled) {
          expect((await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(await article.evaluate(element => {
          const bounds = element.getBoundingClientRect();
          return [...element.querySelectorAll('p, li, h2, img, [role="note"]')].every(child => {
            const content = child.getBoundingClientRect();
            return content.left >= bounds.left - 1 && content.right <= bounds.right + 1;
          });
        })).toBe(true);
        await page.locator('article h1').scrollIntoViewIfNeeded();
        await capture(lesson.slug);
        evidence.push({ url: page.url(), title: lesson.title, headings: 5, notes: lesson.notes, images: lesson.images });

        if (scenario.javaScriptEnabled) {
          await page.locator('[data-slot="lesson-completion"] button').click();
        } else {
          await page.goto(course);
          if (index === 0) await entries.nth(1).click();
        }
      }
      await expect(page).toHaveURL(course);
      expect(context.pages()).toHaveLength(1);
      expect(errors).toEqual([]);
      await testInfo.attach('blog-evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    } finally { await context.close(); }
  });
}
