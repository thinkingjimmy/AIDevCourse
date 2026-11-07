import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readCatalog } from '../../../../src/lib/content/manifest';
import { languageNames, type Locale } from '../../../../src/lib/i18n/config';
import { localePath } from '../../../../src/lib/i18n/routing';

const slugs = ['what-a-language-model-does', 'what-is-a-token', 'why-model-answers-vary', 'how-models-calculate-token-probabilities'];
const headingCounts = [3, 3, 7, 6];
const achievementIds = ['input-shapes-output', 'token-boundaries', 'sampling-can-vary', 'token-probability-not-truth'];
const answers = ['clarify-requirements', 'text-pieces', 'sampling', 'next-token'];
const examples = {
  en: { count: 8, ids: [5299, 382, 290, 11122, 306, 150150, 4044, 30], output: 'Today', outputId: 18449 },
  ja: { count: 12, ids: [45396, 3385, 68112, 13465, 3385, 867, 25717, 5205, 85545, 15121, 7128, 4802], output: '今日', outputId: 45396 },
  fr: { count: 9, ids: [77754, 11160, 7473, 25313, 1221, 150150, 32226, 36890, 1423], output: 'Aujourd', outputId: 127519 },
  es: { count: 7, ids: [68156, 12841, 15105, 20502, 469, 150150, 30], output: 'Hoy', outputId: 77659 },
};
const targetLocales = ['en', 'ja', 'fr', 'es'] as const;
const path = (locale: Locale, slug?: string) => localePath(locale, `/courses/llm-101${slug ? `/${slug}` : ''}`);

async function capture(locator: Locator, name: string) {
  const page = locator.page();
  const viewport = page.viewportSize()!;
  const height = Math.ceil((await locator.boundingBox())!.height);
  await page.setViewportSize({ ...viewport, height: Math.max(viewport.height, height + 320) });
  try {
    await locator.scrollIntoViewIfNeeded();
    const box = (await locator.boundingBox())!;
    const x = Math.max(0, box.x - 8);
    const y = Math.max(0, box.y - 16);
    const clip = { x, y, width: Math.min(viewport.width - x, box.width + 16), height: box.height + 32 };
    await test.info().attach(name, { body: await page.screenshot({ clip, animations: 'disabled' }), contentType: 'image/png' });
  } finally { await page.setViewportSize(viewport); }
}

async function expectFits(page: Page, locator: Locator) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const geometry = await locator.evaluate((root) => {
    const bounds = root.getBoundingClientRect();
    return { width: root.clientWidth, scrollWidth: root.scrollWidth, overflow: [...root.querySelectorAll<HTMLElement>('button, select, [data-token-candidate], [data-score-candidate], [data-token-pairs] li')].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || element.scrollWidth > element.clientWidth + 1);
    }).map((element) => ({ text: element.textContent, width: element.clientWidth, scrollWidth: element.scrollWidth })) };
  });
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.overflow).toEqual([]);
  return geometry;
}

test.describe('Localized LLM fundamentals', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'Uses the published fundamentals module.');

  for (const locale of targetLocales) {
    const messages = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
    const example = examples[locale];

    test(`${locale}: all four lessons, illustrations, diagrams, and achievements`, async ({ page }) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width: 1280, height: 960 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto(path(locale));
      const catalogLinks = page.locator('section[aria-labelledby="course-catalog"] ol').first().locator('a');
      await expect(catalogLinks).toHaveCount(4);
      expect(await catalogLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(slugs.map((slug) => path(locale, slug)));
      const evidence = [];
      const documents = readCatalog().documents;
      for (const [index, slug] of slugs.entries()) {
        const response = await page.goto(path(locale, slug));
        expect(response?.status()).toBe(200);
        const document = documents.find((entry) => entry.url === path(locale, slug))!;
        await expect(page.locator('article h1')).toHaveText(document.data.title);
        await expect(page.locator('article h2')).toHaveCount(headingCounts[index]);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path(locale, slug)}$`));
        await expect(page.locator('article')).not.toContainText('Hello, world!');
        const picker = page.locator('.language-picker').first();
        await picker.locator('summary').click();
        for (const target of ['zh', ...targetLocales] as const) {
          const link = picker.getByRole('link', { name: languageNames[target], exact: true });
          await expect(link).toHaveAttribute('href', path(target, slug));
          await expect(link.locator('small')).toHaveCount(0);
        }
        await page.keyboard.press('Escape');
        if (index === 0) {
          const illustration = page.locator('article img[src*="next-character"]');
          await expect(illustration).toBeVisible();
          await expect.poll(() => illustration.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(600);
          await expect(illustration).toHaveAttribute('alt', /.+/);
          const imageUrl = new URL((await illustration.getAttribute('src'))!, page.url());
          const original = await page.request.get(imageUrl.searchParams.get('url') ?? imageUrl.pathname);
          expect(original.ok()).toBe(true);
          const digest = (data: Buffer) => createHash('sha256').update(data).digest('hex');
          expect(digest(await original.body())).toBe(digest(readFileSync(`public/images/courses/what-a-language-model-does/${locale}/next-character.webp`)));
          await expect(page.locator('[data-state="thinking"] [role="status"]')).toHaveText(messages.Ui.thinkingStatus);
          const generation = page.locator('[data-generation-demo]');
          await expect(generation).toHaveAttribute('lang', locale);
          await expect(generation).toHaveAttribute('data-complete', 'true');
          await expect(generation.locator('[data-generation-output]')).toHaveText(messages.Generation.answer);
          await capture(illustration, `${locale}-illustration`);
          await capture(generation, `${locale}-generation-desktop`);
        }
        if (index === 1) {
          const diagram = page.locator('[data-tokenization-diagram]');
          await expect(diagram).toHaveAttribute('lang', locale);
          await expect(diagram.locator('[data-token-pairs] li')).toHaveCount(example.count);
          expect(await diagram.locator('[data-token-id]').evaluateAll((tokens) => tokens.map((token) => Number(token.getAttribute('data-token-id'))))).toEqual(example.ids);
          await expect(diagram.getByLabel(messages.Tokenization.inputArray)).toHaveText(`[${example.ids.join(', ')}]`);
          await expect(diagram.getByLabel(messages.Tokenization.outputArray)).toHaveText(`[${example.outputId}]`);
          await expect(diagram.getByRole('group', { name: messages.Tokenization.decodingLabel }).locator('dt')).toHaveText([messages.Tokenization.tokenId, messages.Tokenization.token]);
          await expect(diagram.locator('[data-token-output]')).toHaveText(example.output);
          const text = await diagram.locator('[data-token-pairs] dt').evaluateAll((tokens) => tokens.map((token) => [...token.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join('')).join(''));
          expect(text).toBe(messages.Generation.question);
          await capture(diagram, `${locale}-tokenization-desktop`);
        }
        if (index === 2) await expect(page.locator('article table')).toHaveCount(5);
        if (index === 3) {
          const diagram = page.locator('[data-token-probability-diagram]');
          await expect(diagram).toHaveAttribute('lang', locale);
          await expect(diagram.locator('[data-token-candidate]')).toHaveText([messages.TokenProbability.umbrella, messages.TokenProbability.raincoat, messages.TokenProbability.hat]);
          await expect(diagram.locator('[data-probability-output]')).toHaveText(messages.TokenProbability.umbrella);
          await expect(diagram.locator('[data-probability-sampling]')).toContainText(messages.TokenProbability.sampling.replace('{token}', messages.Tokenization.tokenId));
          await expect(page.locator('article .katex-display annotation')).toHaveText('y = ax + b');
          await capture(diagram, `${locale}-probability-desktop`);
        }
        const challenge = page.locator(`[data-achievement="${achievementIds[index]}"]`);
        await challenge.locator('input').first().check();
        await expect(challenge).toHaveAttribute('data-state', 'incorrect');
        await expect(challenge).toContainText(messages.Achievement.incorrect);
        await challenge.locator(`input[value="${answers[index]}"]`).click();
        await expect(challenge).toHaveAttribute('data-state', 'unlocked');
        evidence.push({ url: page.url(), title: await page.locator('h1').textContent(), achievement: achievementIds[index] });
      }
      const sourceRecord = await page.evaluate(() => localStorage.getItem('lac:v1:llm-101:achievement:token-probability-not-truth'));
      const picker = page.locator('.language-picker').first();
      await picker.locator('summary').click();
      await picker.getByRole('link', { name: languageNames.zh, exact: true }).click();
      await expect(page).toHaveURL(path('zh', slugs[3]));
      await expect(page.locator('[data-achievement="token-probability-not-truth"]')).toHaveAttribute('data-state', 'unlocked');
      expect(await page.evaluate(() => localStorage.getItem('lac:v1:llm-101:achievement:token-probability-not-truth'))).toBe(sourceRecord);
      expect(errors).toEqual([]);
      await test.info().attach(`${locale}-catalog-and-achievements`, { body: JSON.stringify({ evidence, tokenization: example, sharedRecord: sourceRecord, errors }, null, 2), contentType: 'application/json' });
    });

    test(`${locale}: playback and menus remain usable on an enlarged narrow screen`, async ({ page }) => {
      test.setTimeout(60000);
      await page.setViewportSize({ width: 320, height: 960 });
      await page.clock.install({ time: new Date('2026-11-07T00:00:00Z') });
      await page.clock.pauseAt(new Date('2026-11-07T00:00:01Z'));
      await page.goto(path(locale, slugs[0]));
      await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
      const generation = page.locator('[data-generation-demo]');
      await expect(generation).toHaveAttribute('data-ready', 'true');
      await generation.scrollIntoViewIfNeeded();
      await page.clock.runFor(100);
      await generation.getByRole('button', { name: messages.Generation.replay, exact: true }).click();
      await page.clock.runFor(1700);
      await generation.getByRole('button', { name: messages.Generation.pause, exact: true }).click();
      const selected = generation.locator('[data-selected="true"]');
      await expect(selected.locator('[data-letter]')).toHaveText(messages.Generation.answer[0]);
      await expect(selected).toHaveAttribute('data-probability', '42');
      await page.clock.runFor(1000);
      await expect(generation).toHaveAttribute('data-phase', 'selected');
      await generation.getByRole('button', { name: messages.Generation.resume, exact: true }).click();
      await page.clock.runFor(120000);
      await expect(generation).toHaveAttribute('data-complete', 'true');
      await expect(generation.locator('[data-generation-output]')).toHaveText(messages.Generation.answer);
      const geometry = [await expectFits(page, generation)];
      await capture(generation, `${locale}-generation-enlarged`);
      await generation.getByRole('button', { name: messages.Generation.replay, exact: true }).click();
      await expect(generation).toHaveAttribute('data-round', '1');
      await expect(generation.locator('[data-generation-output]')).toBeEmpty();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(generation).toHaveAttribute('data-complete', 'true');
      const menu = page.locator('[data-menu-comparison]');
      await menu.scrollIntoViewIfNeeded();
      await menu.getByRole('combobox').selectOption('B');
      await expect(menu.getByRole('combobox')).toHaveAccessibleName(messages.MenuComparison.native + messages.MenuComparison.selected.replace('{choice}', messages.MenuComparison.choice.replace('{letter}', 'B')));
      const custom = menu.getByRole('button');
      await custom.focus();
      await page.keyboard.press('ArrowDown');
      await page.clock.runFor(100);
      await expect(page.getByRole('menuitem').first()).toBeFocused();
      await expect(page.getByRole('menuitem')).toHaveText(['A', 'B', 'C'].map((letter) => messages.MenuComparison.choice.replace('{letter}', letter)));
      await page.keyboard.press('ArrowDown');
      await page.clock.runFor(100);
      await expect(page.getByRole('menuitem').nth(1)).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(custom).toHaveAccessibleName(messages.MenuComparison.custom + messages.MenuComparison.selected.replace('{choice}', messages.MenuComparison.choice.replace('{letter}', 'B')));
      geometry.push(await expectFits(page, menu));
      await capture(menu, `${locale}-menus-enlarged`);
      await page.clock.resume();
      for (const [slug, selector] of [[slugs[1], '[data-tokenization-diagram]'], [slugs[3], '[data-token-probability-diagram]']]) {
        await page.goto(path(locale, slug));
        await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
        const diagram = page.locator(selector);
        geometry.push(await expectFits(page, diagram));
        const accessibility = await new AxeBuilder({ page }).include(selector).withTags(['wcag2a', 'wcag2aa']).analyze();
        expect(accessibility.violations).toEqual([]);
        await capture(diagram, `${locale}-${slug}-enlarged`);
      }
      await test.info().attach(`${locale}-enlarged-layout`, { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
    });

    test(`${locale}: localized reading and explanations work without JavaScript`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
      try {
        const page = await context.newPage();
        await page.goto(path(locale, slugs[0]));
        const generation = page.locator('[data-generation-demo]');
        await generation.locator('summary').click();
        await expect(generation.locator('noscript ol li')).toHaveCount(5);
        await expect(generation.locator('noscript ol li').last()).toContainText(messages.Generation.answer);
        await expect(page.locator('[data-menu-comparison] select')).toBeVisible();
        await capture(generation, `${locale}-generation-no-js`);
        for (const slug of slugs.slice(1)) {
          await page.goto(path(locale, slug));
          const challenge = page.locator('[data-achievement]');
          await challenge.locator('summary').click();
          await expect(challenge.locator('noscript > p')).toHaveText(messages.Achievement.noJs);
          await expect(challenge.locator('noscript details p')).toBeVisible();
        }
        await capture(page.locator('[data-token-probability-diagram]'), `${locale}-probability-no-js`);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      } finally { await context.close(); }
    });
  }
});
