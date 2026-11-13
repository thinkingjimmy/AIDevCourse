import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { readCatalog } from '../../../../src/lib/content/manifest';
import { languageNames } from '../../../../src/lib/i18n/config';
import { capture, locales, mockEmbeds, path, slugs } from './helpers';

const headingCounts = [5, 4, 5, 4];
const noteCounts = [2, 2, 1, 2];
const exercises = [
  ['chat-history-as-input', 'history-in-input'],
  ['tool-request-vs-execution', 'current-date-from-input-or-tool'],
  ['system-prompt-in-messages', 'system-message'],
];

test.describe('Localized AI applications', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'Uses the published AI applications module.');
  test.beforeEach(async ({ page }) => { await mockEmbeds(page); });

  for (const locale of locales) {
    const messages = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
    const documents = readCatalog().documents;
    const getDocument = (slug: string) => documents.find((entry) => entry.url === path(locale, slug))!;

    test(`${locale}: read four lessons, use tools, and retain achievements across languages`, async ({ page, request }) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width: 1536, height: 960 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
          writeText: async (text: string) => { document.documentElement.dataset.copiedCode = text; },
        } });
      });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        // Next 16 can emit a 404 for an RSC segment prefetch that is not generated for every
        // course route (for example when opening Agent 101 from a lesson). The failed prefetch
        // does not affect navigation or the rendered lesson, so ignore it here.
        if (message.text().includes('404') && message.location().url.includes('_rsc=')) return;
        errors.push(message.text());
      });
      await page.goto(path(locale));
      const catalog = page.locator('section[aria-labelledby="course-catalog"]');
      await expect(catalog.locator('h3')).toHaveCount(3);
      await expect(catalog.locator('a')).toHaveCount(13);
      expect(await catalog.locator('ol').nth(2).locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(slugs.map((slug) => path(locale, slug)));
      await expect(catalog.locator('ol').nth(2).locator('li a > span:first-child')).toHaveText(['3.1', '3.2', '3.3', '3.4']);
      const evidence = [];
      for (const [index, slug] of slugs.entries()) {
        const navigation = index === 0 ? catalog : page.locator('[data-slot="sidebar-container"]');
        await navigation.locator(`a[href="${path(locale, slug)}"]`).click();
        await expect(page).toHaveURL(path(locale, slug));
        await expect(page.locator('article h1')).toHaveText(getDocument(slug).data.title);
        await expect(page.locator('article h2')).toHaveCount(headingCounts[index]);
        await expect(page.locator('[data-jimmy-note-anchor]')).toHaveCount(noteCounts[index]);
        await expect(page.locator('article table')).toHaveCount(index === 1 ? 1 : 0);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path(locale, slug)}$`));
        const picker = page.locator('.language-picker').first();
        await picker.locator('summary').click();
        for (const target of ['zh', ...locales] as const) {
          const link = picker.getByRole('link', { name: languageNames[target], exact: true });
          await expect(link).toHaveAttribute('href', path(target, slug));
          await expect(link.locator('small')).toHaveCount(0);
        }
        await page.keyboard.press('Escape');
        if (index === 1 || index === 3) {
          const diagrams = page.locator('[data-component="mermaid"]');
          await expect(diagrams).toHaveCount(index === 1 ? 2 : 1);
          for (const [number, diagram] of (await diagrams.all()).entries()) {
            await expect(diagram).toHaveAccessibleName(messages.Ui.mermaidDiagram);
            await expect(diagram.locator('svg')).toHaveCount(1);
            const text = (await diagram.textContent())!;
            if (locale !== 'ja') expect(text).not.toMatch(/\p{Script=Han}/u);
            else expect(text).not.toMatch(/服务器|返回|工具调用|用户|盗梦空间|黑客帝国/);
            if (index === 3) expect(text).toMatch(/3969/);
            await capture(diagram, `${locale}-${slug}-diagram-${number}`);
            await test.info().attach(`${locale}-${slug}-diagram-${number}-svg`, {
              body: await diagram.locator('svg').evaluate((svg) => svg.outerHTML), contentType: 'image/svg+xml',
            });
          }
          const calls = page.locator('[data-component="chat-tool-call"]');
          await expect(calls).toHaveCount(index === 1 ? 2 : 1);
          for (const [number, call] of (await calls.all()).entries()) {
            await expect(call).toHaveAttribute('data-tool', 'search_web');
            const trigger = call.locator('[data-slot="trace-collapsible-trigger"]');
            await expect(trigger).toHaveAccessibleName(new RegExp(messages.Ui.toolCallComplete));
            const expanded = number === 0;
            await expect(trigger).toHaveAttribute('aria-expanded', String(expanded));
            await trigger.focus();
            await trigger.press('Enter');
            await expect(trigger).toHaveAttribute('aria-expanded', String(!expanded));
            await trigger.press('Space');
            await expect(trigger).toHaveAttribute('aria-expanded', String(expanded));
          }
          if (index === 1) {
            const [input, result] = (await calls.first().locator('pre').allTextContents()).map((text) => JSON.parse(text));
            expect(input.query).toBe('Guangzhou weather forecast for tomorrow');
            expect(result).toEqual({ forecast: 'Light rain', temperature_range: '23-28 C' });
            const citation = page.locator('[data-citation-trigger]');
            await expect(citation).toHaveAttribute('href', 'https://www.weather.com.cn/weather/101280101.shtml');
            await expect(citation).toHaveAccessibleName(new RegExp(messages.Ui.opensInNewTab.replace(/[()]/g, '\\$&')));
            await citation.focus();
            await expect(page.getByRole('tooltip')).toBeVisible();
            await capture(page.getByRole('tooltip'), `${locale}-weather-citation`);
            await page.keyboard.press('Escape');
          } else {
            const source = readFileSync(`content/${locale}/llm-101/ai-applications/${slug}.mdx`, 'utf8');
            const code = [...source.matchAll(/```json fold="[^\n]+\n([\s\S]*?)\n```/g)].map((match) => match[1]);
            const blocks = page.locator('[data-component="code-block"][data-foldable]');
            await expect(blocks).toHaveCount(2);
            for (const [number, block] of (await blocks.all()).entries()) {
              const fold = block.locator('details');
              await expect(fold).not.toHaveAttribute('open');
              await expect(fold.locator('summary')).toContainText(code[number].split('\n')[6].trim());
              await block.getByRole('button', { name: messages.Ui.copy, exact: true }).click();
              await expect.poll(() => page.evaluate(() => document.documentElement.dataset.copiedCode)).toBe(code[number]);
              await fold.locator('summary').press('Enter');
              await expect(fold.locator('pre')).toBeVisible();
              await expect(fold.locator('pre')).toContainText('Inception movie director');
              await fold.locator('summary').press('Space');
              await expect(fold.locator('pre')).toBeHidden();
            }
            await expect(page.locator('article a[href="/zh/courses/agent-101"]').first()).toContainText(languageNames.zh);
            await expect(page.locator('article a[href="/zh/courses/coding-101"]')).toContainText(languageNames.zh);
            await page.locator('article a[href="/zh/courses/agent-101"]').last().click();
            await expect(page).toHaveURL('/zh/courses/agent-101');
            await expect(page.locator('[data-slot="course-empty"]')).toHaveCount(0);
            await expect(page.getByRole('link', { name: '开始第一课', exact: true })).toBeVisible();
            await page.goBack();
            await expect(page).toHaveURL(path(locale, slug));
          }
        }
        const exercise = exercises[index];
        await expect(page.locator('[data-achievement]')).toHaveCount(exercise ? 1 : 0);
        if (exercise) {
          const [id, answer] = exercise;
          const challenge = page.locator(`[data-achievement="${id}"]`);
          await challenge.locator('input').first().check();
          await expect(challenge).toHaveAttribute('data-state', 'incorrect');
          await expect(challenge).toContainText(messages.Achievement.incorrect);
          await challenge.locator(`input[value="${answer}"]`).click();
          await expect(challenge).toHaveAttribute('data-state', 'unlocked');
        }
        evidence.push({ url: page.url(), title: getDocument(slug).data.title, headings: headingCounts[index] });
      }
      const accessibility = await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await page.keyboard.press('Control+k');
      const search = page.getByRole('textbox', { name: messages.Search.open });
      await search.fill(getDocument(slugs[1]).data.title);
      await page.locator(`.search-result[href="${path(locale, slugs[1])}"]`).first().click();
      await expect(page).toHaveURL(path(locale, slugs[1]));
      const key = 'lac:v1:llm-101:achievement:tool-request-vs-execution';
      const record = await page.evaluate((key) => localStorage.getItem(key), key);
      const picker = page.locator('.language-picker').first();
      await picker.locator('summary').click();
      await picker.getByRole('link', { name: languageNames.zh, exact: true }).click();
      await expect(page).toHaveURL(path('zh', slugs[1]));
      await expect(page.locator('[data-achievement="tool-request-vs-execution"]')).toHaveAttribute('data-state', 'unlocked');
      expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(record);
      const sitemap = await request.get('/sitemap.xml');
      const xml = await sitemap.text();
      for (const slug of slugs) expect(xml).toContain(path(locale, slug));
      expect(errors).toEqual([]);
      await test.info().attach(`${locale}-reading-evidence`, { body: JSON.stringify({ evidence, record, errors, accessibility: accessibility.violations }, null, 2), contentType: 'application/json' });
    });

    for (const javaScriptEnabled of [true, false]) {
      test(`${locale}: tools, advice, and Agent on a narrow screen ${javaScriptEnabled ? 'with enlarged text' : 'without JavaScript'}`, async ({ browser, baseURL }) => {
        test.setTimeout(60000);
        const context = await browser.newContext({ baseURL, javaScriptEnabled, reducedMotion: 'reduce', viewport: { width: 320, height: 960 } });
        try {
          const page = await context.newPage();
          for (const slug of [slugs[1], slugs[2], slugs[3]]) {
            expect((await page.goto(path(locale, slug)))?.status()).toBe(200);
            if (javaScriptEnabled) await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
            await expect(page.locator('article h1')).toHaveText(getDocument(slug).data.title);
            for (const diagram of await page.locator('[data-component="mermaid"]').all()) {
              await expect(diagram).toHaveAttribute('tabindex', '0');
              expect(await diagram.evaluate((root) => getComputedStyle(root).overflowX)).toBe('auto');
              await diagram.focus();
              await page.keyboard.down('ArrowRight');
              try { await expect.poll(() => diagram.evaluate((root) => root.scrollLeft)).toBeGreaterThan(0); }
              finally { await page.keyboard.up('ArrowRight'); }
              await capture(diagram, `${locale}-${slug}-${javaScriptEnabled ? 'enlarged' : 'no-js'}`);
            }
            if (!javaScriptEnabled) {
              for (const call of await page.locator('[data-component="chat-tool-call"]').all()) {
                const details = call.locator('details');
                await details.locator('summary').click();
                await details.locator('summary').click();
                await expect(details.locator('summary')).toHaveAccessibleName(new RegExp(messages.Ui.toolCallComplete));
              }
              for (const challenge of await page.locator('[data-achievement]').all()) {
                await challenge.locator('summary').click();
                await expect(challenge.locator('noscript details p')).toBeVisible();
              }
            }
            for (const fold of await page.locator('[data-foldable] details').all()) {
              await fold.locator('summary').click();
              await expect(fold.locator('pre')).toBeVisible();
            }
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          }
        } finally { await context.close(); }
      });
    }
  }
});
