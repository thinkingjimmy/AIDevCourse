import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { capture, lesson, menu, openLesson, selectText } from './helpers';

test.skip(process.env.CONTENT_TEST === '1', 'Uses published multilingual lessons.');

test('both actions open the correct prefilled GitHub form without losing the selected passage', async ({ page, context }, testInfo) => {
  await context.route('https://github.com/thinkingjimmy/aidevcourse/issues/new**', route => route.fulfill({ contentType: 'text/html', body: '<title>Issue form destination</title>' }));
  await openLesson(page);
  const title = await page.locator('article h1').innerText();
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  const paragraph = page.locator('article > .prose > p').first();
  for (const action of [
    { label: '提问', template: '01-question.yml', prefix: 'Question', field: 'question' },
    { label: '纠错', template: '02-correction.yml', prefix: 'Correction', field: 'original' },
  ]) {
    await page.evaluate(() => window.getSelection()!.removeAllRanges());
    const selected = await selectText(paragraph);
    const link = menu(page).getByRole('link', { name: action.label, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const href = (await link.getAttribute('href'))!;
    const url = new URL(href);
    expect(url.origin + url.pathname).toBe('https://github.com/thinkingjimmy/aidevcourse/issues/new');
    expect(url.searchParams.get('template')).toBe(action.template);
    expect(url.searchParams.get('title')).toBe(`[${action.prefix}] ${title}`);
    expect(url.searchParams.get('page')).toContain(title);
    expect(url.searchParams.get('page')).toContain(canonical);
    expect(url.searchParams.get(action.field)).toBe(`> ${selected.replaceAll('\n', '\n> ')}\n\n`);
    expect(url.searchParams.has('labels')).toBe(false);
    expect(readFileSync(`.github/ISSUE_TEMPLATE/${action.template}`, 'utf8')).toContain(`id: ${action.field}`);
    await capture(page, testInfo, `prefill-${action.prefix}`);
    const popup = page.waitForEvent('popup');
    await link.click();
    const destination = await popup;
    await expect(destination).toHaveURL(href);
    await expect(destination).toHaveTitle('Issue form destination');
    expect(await page.evaluate(() => window.getSelection()!.toString().trim())).toBe(selected);
    await expect(page).toHaveURL(lesson);
    await destination.close();
  }
});

test('special characters round-trip and long passages truncate only the quote within the URL budget', async ({ page }, testInfo) => {
  await openLesson(page);
  const samples = ['中文 日本語 café & ? # + = % <tag> "quotes" 😀\nSecond line', '中文😀日本語 &?#%\n'.repeat(1200)];
  for (const [index, sample] of samples.entries()) {
    await page.evaluate(text => {
      const element = document.createElement('p');
      element.dataset.feedbackSample = '';
      element.style.whiteSpace = 'pre-wrap';
      element.textContent = text;
      document.querySelector('article > .prose')!.prepend(element);
    }, sample);
    const selected = await selectText(page.locator('[data-feedback-sample]').first());
    await expect(menu(page)).toBeVisible();
    for (const [field, link] of [['question', menu(page).locator('a').first()], ['original', menu(page).locator('a').last()]] as const) {
      const url = new URL((await link.getAttribute('href'))!);
      expect(url.href.length).toBeLessThanOrEqual(6000);
      const quote = url.searchParams.get(field)!;
      expect(quote.isWellFormed()).toBe(true);
      expect(url.searchParams.get('page')).toContain(lesson);
      if (index === 0) expect(quote).toBe(`> ${selected.replaceAll('\n', '\n> ')}\n\n`);
      else {
        expect(quote).toContain('原文已节选');
        expect(quote.length).toBeLessThan(selected.length);
        expect(quote.startsWith('> 中文😀日本語 &?#%')).toBe(true);
      }
    }
    if (index === 1) await expect(menu(page)).toContainText('原文已节选');
    await capture(page, testInfo, `quote-${index === 0 ? 'special-characters' : 'truncated'}`);
    await page.locator('[data-feedback-sample]').first().evaluate(element => element.remove());
  }
});

test('all five languages use localized menu labels and their own page URL', async ({ page }, testInfo) => {
  for (const locale of ['zh', 'en', 'ja', 'fr', 'es']) {
    const path = lesson.replace('/zh/', `/${locale}/`);
    const messages = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8')).Course;
    await openLesson(page, path);
    await selectText(page.locator('article h1'));
    await expect(menu(page)).toHaveAccessibleName(messages.selectionActions);
    await expect(menu(page).getByRole('link', { name: messages.selectionQuestion, exact: true })).toBeVisible();
    await expect(menu(page).getByRole('link', { name: messages.selectionCorrection, exact: true })).toBeVisible();
    const url = new URL((await menu(page).locator('a').first().getAttribute('href'))!);
    expect(url.searchParams.get('page')).toContain(new URL(page.url()).pathname);
    await capture(page, testInfo, `localized-${locale}`);
  }
});
