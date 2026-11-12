import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { locales, htmlLanguages } from '../../../src/lib/i18n/config';
import { localePath } from '../../../src/lib/i18n/routing';
import { programmingSections } from '../../../src/lib/vocabulary/programming';

const path = '/zh/programming-vocabulary/static-website';
const dictionary = (locale: string) => JSON.parse(readFileSync(`src/messages/programming-vocabulary/${locale}.json`, 'utf8'));
const sections = programmingSections['static-website'];

async function navigateSection(page: Page, width: number, id: typeof sections[number], title: string) {
  if (width < 961) {
    const outline = page.locator('[data-slot="programming-article-outline"]');
    if (await outline.getAttribute('open') === null) await outline.locator('summary').click();
    await outline.getByRole('link', { name: title, exact: true }).click();
  } else {
    await page.locator('[data-slot="lesson-toc"]').getByRole('link', { name: title, exact: true }).press('Enter');
  }
  await expect(page).toHaveURL(new RegExp(`#${id}$`));
  await expect(page.locator(`h2#${id}`)).toBeInViewport();
}

for (const scenario of [
  { name: 'desktop', width: 1536, javaScriptEnabled: true },
  { name: 'phone', width: 390, javaScriptEnabled: true },
  { name: 'narrow phone', width: 320, javaScriptEnabled: true },
  { name: 'without JavaScript', width: 390, javaScriptEnabled: false },
]) {
  test(`programming terms use a tutorial article on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 960 },
      javaScriptEnabled: scenario.javaScriptEnabled, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      const capture = async (name: string) => {
        const file = testInfo.outputPath(`${name}.png`);
        await page.screenshot({ path: file, animations: 'disabled' });
        await testInfo.attach(name, { path: file, contentType: 'image/png' });
      };
      const copy = dictionary('zh');
      const term = copy.terms['static-website'];
      await page.goto('/zh?view=resources');
      const resources = page.getByRole('region', { name: '学习资料', exact: true });
      const card = resources.getByRole('link', { name: copy.title, exact: true });
      await expect(card).toHaveAttribute('href', path);
      await expect(card.locator('.optical-disc-meta')).toHaveText('1 词条');
      await card.focus();
      await card.press('Enter');
      await expect(page).toHaveURL(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(term.title);
      const article = page.locator('article#main-content');
      const body = article.locator('[data-slot="programming-article"]');
      await expect(article.locator('[data-slot="term-description"]')).toHaveText(term.description);
      await expect(body.locator('h2')).toHaveText(sections.map(id => term.article[id].heading));
      await expect(article.locator('.vocabulary-card, .vocabulary-grid')).toHaveCount(0);
      await expect(body.locator('[data-component="code-block"]')).toHaveCount(2);
      await expect(body.getByRole('table')).toHaveAccessibleName(term.article.comparison.heading);
      await expect(body.locator('tbody tr')).toHaveCount(4);
      await capture('article-opening');
      if (scenario.javaScriptEnabled) {
        if (scenario.width < 961) await page.getByRole('button', { name: copy.openDirectory, exact: true }).click();
        const sidebar = page.locator(scenario.width < 961 ? '[data-mobile="true"]' : '[data-slot="sidebar-inner"]');
        const search = sidebar.getByRole('searchbox', { name: copy.search });
        await expect(search).toBeEnabled();
        await search.fill('STATIC WEBSITE');
        const active = sidebar.getByRole('link', { name: term.title, exact: true });
        await expect(active).toHaveAttribute('href', path);
        await expect(active).toHaveAttribute('aria-current', 'page');
        await expect(active).toHaveAttribute('data-active', 'true');
        await active.click();
        if (scenario.width < 961) await expect(page.locator('[data-mobile="true"]')).toBeHidden();
      }
      await navigateSection(page, scenario.width, 'interaction', term.article.interaction.heading);
      const demo = page.locator('[data-programming-demo="static-website"]');
      await expect(demo.locator('.static-site-files code')).toHaveText(['index.html', 'style.css', 'script.js']);
      const responses = demo.locator('[data-slot="server-deliveries"]');
      const clicks = demo.locator('[data-slot="browser-clicks"]');
      await expect(responses).toHaveText('服务器送出网页：1 次');
      await expect(clicks).toHaveText('页面上的数字：0');
      if (scenario.javaScriptEnabled) {
        await expect(demo).toHaveAttribute('data-ready', 'true');
        await demo.locator('[data-action="click"]').click();
        await demo.locator('[data-action="click"]').press('Enter');
        await expect(clicks).toHaveText('页面上的数字：2');
        await expect(responses).toHaveText('服务器送出网页：1 次');
        await capture('browser-only-interaction');
        await demo.locator('[data-action="visit"]').click();
        await expect(clicks).toHaveText('页面上的数字：0');
        await expect(responses).toHaveText('服务器送出网页：2 次');
        await demo.locator('[data-action="reset"]').click();
        await expect(responses).toHaveText('服务器送出网页：1 次');
      } else {
        await expect(demo.locator('[data-action="click"]')).toBeHidden();
        await expect(demo.locator('noscript p')).toHaveText(copy.demo.noJs);
        await expect(demo.locator('noscript p')).toBeVisible();
      }
      await navigateSection(page, scenario.width, 'comparison', term.article.comparison.heading);
      await expect(body.getByRole('table')).toBeInViewport();
      await capture('comparison');
      await page.goBack();
      await expect(page).toHaveURL(`${path}#interaction`);
      await expect(page.locator('h2#interaction')).toBeInViewport();
      await page.reload();
      await expect(page.locator('h2#interaction')).toBeInViewport();
      if (scenario.javaScriptEnabled) {
        await expect(demo).toHaveAttribute('data-ready', 'true');
        const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach('article-layout', { body: JSON.stringify(await article.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        return { width: element.clientWidth, scroll: element.scrollWidth, overflow: [...element.querySelectorAll('*')].filter(child =>
          child.getBoundingClientRect().right > bounds.right + 1 && !child.closest('pre, [data-slot="table-container"], [data-component="code-block"]'))
          .map(child => ({ tag: child.tagName, id: child.id, className: child.className, right: child.getBoundingClientRect().right, width: child.getBoundingClientRect().width })).slice(0, 30) };
      }), null, 2), contentType: 'application/json' });
      expect(await article.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      expect(errors).toEqual([]);
      await testInfo.attach('article-evidence', { body: JSON.stringify({ viewport: scenario.width, javaScriptEnabled: scenario.javaScriptEnabled,
        url: page.url(), sections, layout: 'tutorial', interactionsVerified: scenario.javaScriptEnabled }, null, 2), contentType: 'application/json' });
    } finally { await context.close(); }
  });
}

test('all five languages expose the article, redirects, references, and metadata', async ({ page, request }, testInfo) => {
  const evidence = [];
  for (const locale of locales) {
    const copy = dictionary(locale);
    const term = copy.terms['static-website'];
    const url = localePath(locale, '/programming-vocabulary/static-website');
    await page.goto(`${url}#misconceptions`);
    await expect(page.locator('html')).toHaveAttribute('lang', htmlLanguages[locale]);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(term.title);
    await expect(page.locator('[data-slot="term-description"]')).toHaveText(term.description);
    await expect(page.locator('h2#misconceptions')).toBeInViewport();
    await expect(page.locator('[data-slot="programming-article"] h2')).toHaveText(sections.map(id => term.article[id].heading));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${url}$`));
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(6);
    const references = page.locator('h2#references + p + ul a');
    await expect(references).toHaveCount(5);
    for (const link of await references.evaluateAll(elements => elements.map(element => (element as HTMLAnchorElement).href))) {
      expect(new URL(link).hostname).toMatch(/^(developer\.mozilla\.org|docs\.github\.com)$/);
    }
    for (const entry of ['/programming-vocabulary', '/programming-vocabulary/web-foundations']) {
      expect(new URL((await request.get(localePath(locale, entry))).url()).pathname).toBe(url);
    }
    evidence.push({ locale, url, title: term.title, sections: sections.length });
  }
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const locale of locales) expect(sitemap).toContain(localePath(locale, '/programming-vocabulary/static-website'));
  expect(sitemap).not.toContain('/programming-vocabulary/web-foundations');
  expect((await request.get('/zh/programming-vocabulary/unpublished')).status()).toBe(404);
  await page.goto(`${path}#misconceptions`);
  await page.locator('.language-picker > summary').click();
  await page.locator('.language-options a[hreflang="en"]').click();
  await expect(page).toHaveURL('/programming-vocabulary/static-website#misconceptions');
  await expect(page.locator('h2#misconceptions')).toBeInViewport();
  await testInfo.attach('localized-article-evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('article prose, code, table, and translated demo fit a narrow phone', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 960 });
  for (const locale of locales) {
    await page.goto(`${localePath(locale, '/programming-vocabulary/static-website')}#interaction`);
    const demo = page.locator('[data-programming-demo="static-website"]');
    await expect(demo).toHaveAttribute('data-ready', 'true');
    await demo.locator('[data-action="click"]').click();
    const overflow = await page.locator('article#main-content, [data-slot="programming-article"], .vocabulary-controls, .static-site-preview').evaluateAll(elements =>
      elements.filter(element => element.scrollWidth > element.clientWidth + 1).map(element => element.className));
    expect(overflow).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(demo.locator('[data-slot="server-deliveries"]')).toContainText('1');
    await expect(demo.locator('[data-slot="browser-clicks"]')).toContainText('1');
    const file = testInfo.outputPath(`programming-${locale}-narrow.png`);
    await page.screenshot({ path: file, animations: 'disabled' });
    await testInfo.attach(`${locale} narrow article`, { path: file, contentType: 'image/png' });
  }
});
