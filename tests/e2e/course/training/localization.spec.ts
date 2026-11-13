import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { readCatalog } from '../../../../src/lib/content/manifest';
import { languageNames } from '../../../../src/lib/i18n/config';
import { getTokenizationExample } from '../../../../src/components/mdx/tokenization/model';
import { capture, expectFits, mockEmbeds, path, readFormula, slugs, verifyImage } from './helpers';

const locales = ['en', 'ja', 'fr', 'es'] as const;
const headingCounts = [3, 6, 4, 5, 3];
const tableCounts = [2, 2, 1, 0, 0];
const exercises = [
  [['generation-vs-verification', 'verify'], ['training-target-not-truth', 'matches-source']],
  [], [['distinguish-audio-inputs', 'missing-audio']], [], [],
];

test.describe('Localized model training', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'Uses the published model-training module.');
  test.beforeEach(async ({ page }) => { await mockEmbeds(page); });

  for (const locale of locales) {
    const messages = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
    const copy = messages.Training;
    const overviewCopy = messages.Pretraining;
    const labels = ['umbrella', 'raincoat', 'hat'].map((id) => copy.candidates[id]);

    test(`${locale}: five lessons, localized images, navigation, and shared achievements`, async ({ page }) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width: 1536, height: 960 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto(path(locale));
      const catalog = page.locator('section[aria-labelledby="course-catalog"]');
      await expect(catalog.locator('h3')).toHaveCount(3);
      await expect(catalog.locator('a')).toHaveCount(13);
      expect(await catalog.locator('ol').nth(1).locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(slugs.map((slug) => path(locale, slug)));
      await expect(catalog.locator('ol').nth(1).locator('li a > span:first-child')).toHaveText(['2.1', '2.2', '2.3', '2.4', '2.5']);
      const evidence = [];
      const documents = readCatalog().documents;
      for (const [index, slug] of slugs.entries()) {
        const navigation = index === 0 ? catalog : page.locator('[data-slot="sidebar-container"]');
        await navigation.locator(`a[href="${path(locale, slug)}"]`).click();
        await expect(page).toHaveURL(path(locale, slug));
        const document = documents.find((entry) => entry.url === path(locale, slug))!;
        await expect(page.locator('article h1')).toHaveText(document.data.title);
        await expect(page.locator('article h2')).toHaveCount(headingCounts[index]);
        await expect(page.locator('article table')).toHaveCount(tableCounts[index]);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path(locale, slug)}$`));
        const picker = page.locator('.language-picker').first();
        await picker.locator('summary').click();
        for (const target of ['zh', ...locales] as const) {
          const link = picker.getByRole('link', { name: languageNames[target], exact: true });
          await expect(link).toHaveAttribute('href', path(target, slug));
          await expect(link.locator('small')).toHaveCount(0);
        }
        await page.keyboard.press('Escape');
        if (index === 0) {
          await expect(page.locator('article a[href="/zh/courses/llm-101/what-is-a-tool"]')).toContainText(languageNames.zh);
          await expect(page.locator('iframe[src*="youtube-nocookie"]')).toHaveAttribute('title', 'Large Language Models explained briefly');
        }
        if (index === 1) {
          const thought = page.locator('[data-component="chat-thinking"]');
          const trigger = thought.locator('[data-slot="trace-collapsible-trigger"]');
          const body = thought.locator('[data-slot="thinking-content"]');
          const answer = thought.locator('..').locator('[data-slot="message-response"]');
          await expect(trigger).toHaveText(messages.Ui.thought);
          await expect(body).toBeHidden();
          await expect(answer).toContainText('1776');
          await trigger.focus();
          await trigger.press('Enter');
          await expect(body).toBeVisible();
          await expect(body).toContainText('1920 − 144');
          await expect(body.locator('br')).toHaveCount(3);
          await capture(thought.locator('..').locator('..'), `${locale}-thinking`);
          await trigger.press('Space');
          await expect(body).toBeHidden();
          await expect(answer).toBeVisible();
        }
        if (index === 2) {
          for (const imageSlug of ['vision-pipeline', 'audio-paths']) {
            const image = page.locator(`article img[src*="${imageSlug}"]`);
            evidence.push(await verifyImage(image, `public/images/courses/how-models-see-and-hear/${locale}/${imageSlug}.webp`));
            await capture(image, `${locale}-${imageSlug}`);
          }
        }
        if (index === 3) {
          await expect(page.locator('article .katex-display annotation')).toContainText('1.2');
          await expect(page.locator('[data-jimmy-note-anchor]')).toHaveCount(2);
        }
        if (index === 4) {
          const embed = page.locator('[data-embed="x"]');
          await embed.scrollIntoViewIfNeeded();
          await expect(embed).toHaveAttribute('data-state', 'unavailable');
          await expect(embed.getByRole('status')).toHaveText(messages.Ui.embedUnavailable);
          await expect(embed.getByRole('link')).toHaveText(messages.Ui.viewOnX);
          await expect(embed.getByRole('link')).toHaveAttribute('href', 'https://x.com/i/status/2114977301247209703');
        }
        await expect(page.locator('[data-achievement]')).toHaveCount(exercises[index].length);
        for (const [id, answer] of exercises[index]) {
          const challenge = page.locator(`[data-achievement="${id}"]`);
          await challenge.locator('input').first().check();
          await expect(challenge).toHaveAttribute('data-state', 'incorrect');
          await expect(challenge).toContainText(messages.Achievement.incorrect);
          await challenge.locator(`input[value="${answer}"]`).click();
          await expect(challenge).toHaveAttribute('data-state', 'unlocked');
        }
        evidence.push({ url: page.url(), title: document.data.title, lessonId: document.data.kind === 'lesson' ? document.data.lessonId : undefined, headings: headingCounts[index] });
      }
      await page.keyboard.press('Control+k');
      const search = page.getByRole('textbox', { name: messages.Search.open });
      await expect(search).toBeFocused();
      await search.fill(documents.find((entry) => entry.url === path(locale, slugs[3]))!.data.title);
      const searchResult = page.locator(`.search-result[href="${path(locale, slugs[3])}"]`).first();
      await expect(searchResult).toBeVisible();
      await searchResult.click();
      await expect(page).toHaveURL(path(locale, slugs[3]));
      await page.locator(`[data-slot="sidebar-container"] a[href="${path(locale, slugs[2])}"]`).click();
      await expect(page).toHaveURL(path(locale, slugs[2]));
      const record = await page.evaluate(() => localStorage.getItem('lac:v1:llm-101:achievement:distinguish-audio-inputs'));
      const picker = page.locator('.language-picker').first();
      await picker.locator('summary').click();
      await picker.getByRole('link', { name: languageNames.zh, exact: true }).click();
      await expect(page).toHaveURL(path('zh', slugs[2]));
      await expect(page.locator('[data-achievement="distinguish-audio-inputs"]')).toHaveAttribute('data-state', 'unlocked');
      expect(await page.evaluate(() => localStorage.getItem('lac:v1:llm-101:achievement:distinguish-audio-inputs'))).toBe(record);
      expect(errors).toEqual([]);
      await test.info().attach(`${locale}-reading-evidence`, { body: JSON.stringify({ evidence, sharedRecord: record, errors }, null, 2), contentType: 'application/json' });
    });

    for (const enlarged of [false, true]) {
      test(`${locale}: training interactions on ${enlarged ? 'an enlarged narrow screen' : 'desktop'}`, async ({ page }) => {
        test.setTimeout(90000);
        await page.setViewportSize(enlarged ? { width: 320, height: 960 } : { width: 1280, height: 960 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(path(locale, slugs[0]));
        if (enlarged) await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
        const name = `${locale}-${enlarged ? 'enlarged' : 'desktop'}`;
        const overview = page.locator('[data-pretraining-overview]');
        await expect(overview).toHaveAttribute('lang', locale);
        await expect(overview).toHaveAccessibleName(overviewCopy.label);
        const tabs = overview.getByRole('tab');
        const images = [];
        const heights = [];
        for (const [index, imageSlug] of ['01-data-cleaning', '02-tokenization', '03-prediction-training'].entries()) {
          await tabs.nth(index).focus();
          if (index) await tabs.nth(index - 1).press('ArrowRight');
          await expect(tabs.nth(index)).toHaveAttribute('aria-selected', 'true');
          images.push(await verifyImage(overview.getByRole('img'), `public/images/courses/how-language-models-are-trained/${locale}/${imageSlug}.webp`));
          if (index === 1) {
            const example = getTokenizationExample(locale);
            await expect(overview.getByRole('img')).toHaveAttribute('alt', new RegExp(example.tokens.map((token) => token.id).join('.*')));
          }
          heights.push((await overview.boundingBox())!.height);
          await capture(overview, `${name}-${imageSlug}`);
        }
        expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
        await tabs.nth(2).press('Home');
        await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
        const zoom = overview.getByRole('button', { name: overviewCopy.zoom.replace('{label}', overviewCopy.cleaning), exact: true });
        await zoom.click();
        await expect(page.getByRole('dialog')).toHaveAccessibleName(overviewCopy.imageTitle.replace('{label}', overviewCopy.cleaning));
        await expect(page.getByRole('button', { name: overviewCopy.close, exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(zoom).toBeFocused();
        const geometry = [await expectFits(overview)];
        const single = page.locator('[data-training-demo="single"]');
        const multiple = page.locator('[data-training-demo="multiple"]');
        const before = single.locator('[data-training-model="before"]');
        await expect(single).toHaveAttribute('lang', locale);
        await expect(single).toHaveAccessibleName(copy.singleLabel);
        await expect(single.locator('[data-training-formula-candidate] > span')).toHaveText(labels);
        await expect(single.locator('[data-training-score], [data-training-input], [data-training-target]')).toHaveCount(0);
        await capture(single, `${name}-initialization`);
        geometry.push(await expectFits(single));
        await single.getByRole('button', { name: copy.actions.initialize, exact: true }).click();
        await expect(single.locator('[data-training-input]')).toHaveText(copy.input + '…');
        const original = await readFormula(before);
        expect(original.map((item) => item.probability)).toEqual([25, 40, 35]);
        await single.getByRole('button', { name: copy.actions.predict, exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(single.locator('[data-training-target]')).toHaveText(labels[0]);
        await expect(single.getByRole('note')).toHaveAccessibleName(copy.comparisonLabel);
        await expect(single.getByRole('note')).toContainText(labels[0]);
        geometry.push(await expectFits(single));
        await capture(single, `${name}-comparison`);
        await single.getByRole('button', { name: copy.actions.compare, exact: true }).click();
        const updated = await readFormula(single.locator('[data-training-model="after"]'));
        expect(await readFormula(before)).toEqual(original);
        expect(updated.map((item) => item.probability)).toEqual([45, 30, 25]);
        expect(updated[0].coefficients).toEqual([0.6, 1.2]);
        await expect(single.getByRole('note')).toHaveCount(0);
        await expect(single.getByRole('button', { name: copy.actions.update, exact: true })).toBeDisabled();
        geometry.push(await expectFits(single));
        await capture(single, `${name}-adjustment`);
        await single.getByRole('button', { name: copy.previous, exact: true }).click();
        await expect(single).toHaveAttribute('data-step', '2');
        await expect(single.locator('[data-training-model="after"]')).toHaveCount(0);
        for (const round of [1, 2, 3]) {
          await multiple.getByRole('button', { name: round === 1 ? copy.multipleActions.start : copy.multipleActions.again, exact: true }).click();
          await expect(multiple).toHaveAttribute('data-round', String(round));
          await expect(multiple.locator('[data-training-candidates] [data-answer="true"]')).toContainText([45, 60, 72][round - 1] + '%');
          await expect(single).toHaveAttribute('data-step', '2');
        }
        await expect(multiple.locator('[data-training-history] li > span:last-child')).toHaveText(['25%', '45%', '60%', '72%']);
        await expect(multiple.getByRole('button', { name: copy.multipleActions.finish, exact: true })).toBeDisabled();
        geometry.push(await expectFits(multiple));
        await capture(multiple, `${name}-multiple-rounds`);
        const accessibility = await new AxeBuilder({ page }).include('[data-pretraining-overview]').include('[data-training-demo]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
        for (const demo of [single, multiple]) await demo.getByRole('button', { name: copy.replay, exact: true }).click();
        await expect(single).toHaveAttribute('data-step', '0');
        await expect(multiple).toHaveAttribute('data-round', '0');
        expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => /:(achievement|completion):/.test(key)))).toEqual([]);
        await test.info().attach(`${name}-interaction-evidence`, { body: JSON.stringify({ geometry, images, original, updated, accessibility: accessibility.violations }, null, 2), contentType: 'application/json' });
      });
    }

    test(`${locale}: all five lessons remain readable without JavaScript`, async ({ browser, baseURL }) => {
      test.setTimeout(90000);
      const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 960 } });
      try {
        const page = await context.newPage();
        await mockEmbeds(page);
        for (const [index, slug] of slugs.entries()) {
          expect((await page.goto(path(locale, slug)))?.status()).toBe(200);
          await expect(page.locator('article h2')).toHaveCount(headingCounts[index]);
          if (index === 0) {
            const overview = page.locator('[data-pretraining-overview]');
            await expect(overview.getByRole('img')).toHaveCount(3);
            await expect(overview.getByRole('list')).toHaveAccessibleName(overviewCopy.fullLabel);
            await expect(overview.getByRole('tablist')).toHaveCount(0);
            const single = page.locator('[data-training-demo="single"]');
            await expect(single.getByRole('list')).toHaveAccessibleName(copy.singleFull);
            await expect(single.getByRole('listitem')).toHaveCount(4);
            await expect(single.getByRole('listitem').nth(2)).toContainText(copy.sourceText);
            await expect(single.getByRole('listitem').last()).toContainText('1.80');
            await expect(single.getByRole('button')).toHaveCount(0);
            await expect(page.locator('noscript [data-training-history] li > span:last-child')).toHaveText(['25%', '45%', '60%', '72%']);
            await capture(overview, `${locale}-overview-no-js`);
            await capture(single, `${locale}-training-no-js`);
          }
          if (index === 1) {
            const thought = page.locator('[data-component="chat-thinking"]');
            await expect(thought.locator('summary')).toHaveText(messages.Ui.thought);
            await thought.locator('summary').click();
            await expect(thought.locator('details [data-slot="thinking-content"]')).toBeVisible();
            await capture(thought, `${locale}-thinking-no-js`);
          }
          for (const challenge of await page.locator('[data-achievement]').all()) {
            await challenge.locator('summary').click();
            await expect(challenge.locator('noscript details p')).toBeVisible();
          }
          if (index === 3) await expect(page.locator('article .katex')).toHaveCount(1);
          if (index === 4) await expect(page.locator('[data-embed="x"]').getByRole('link')).toHaveText(messages.Ui.viewOnX);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
      } finally { await context.close(); }
    });
  }
});
