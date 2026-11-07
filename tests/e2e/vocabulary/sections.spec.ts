import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { locales } from '../../../src/lib/i18n/config';
import { localePath } from '../../../src/lib/i18n/routing';

test.use({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });

const letterTerms = ['kerning', 'optical-kerning', 'x-height', 'cap-height', 'ligature', 'hyphenation', 'widow'];
const expectedOrder = {
  en: ['letterforms', 'interface'], zh: ['interface', 'letterforms'],
  ja: ['interface', 'letterforms'], fr: ['letterforms', 'interface'], es: ['letterforms', 'interface'],
};

for (const locale of locales) {
  test(`${locale} uses localized sections and keeps every term reachable`, async ({ page }, testInfo) => {
    await page.addInitScript(() => { Object.defineProperty(window, 'IntersectionObserver', { value: undefined }); });
    const messages = JSON.parse(readFileSync(`src/messages/vocabulary/${locale}.json`, 'utf8'));
    await page.goto(localePath(locale, '/vocabulary/typography'));
    const sections = page.locator('[data-typography-section]');
    await expect(sections).toHaveCount(2);
    expect(await sections.evaluateAll(items => items.map(item => item.getAttribute('data-typography-section')))).toEqual(expectedOrder[locale]);
    await expect(page.locator('.vocabulary-term')).toHaveCount(6);
    for (const id of expectedOrder[locale]) {
      const section = page.locator(`[data-typography-section="${id}"]`);
      await expect(section.getByRole('heading', { level: 2 })).toHaveText(messages.typographySections[id].title);
      await expect(section.locator('.vocabulary-term')).toHaveCount(3);
      await expect(section.getByRole('heading', { level: 3 })).toHaveCount(3);
    }
    const firstTerm = locale === 'zh' || locale === 'ja' ? 'leading' : 'kerning';
    await expect(page.locator('.vocabulary-term').first()).toHaveAttribute('id', firstTerm);
    const pane = page.locator('[data-slot="vocabulary-scroll"]');
    expect(await pane.evaluate(element => element.scrollTop)).toBe(0);

    const load = page.getByRole('button', { name: messages.loadMore, exact: true });
    for (const count of [12, 18, 21]) {
      await load.click();
      await expect(page.locator('.vocabulary-term')).toHaveCount(count);
    }
    await expect(page.locator('[data-typography-section="letterforms"] .vocabulary-term')).toHaveCount(letterTerms.length);
    expect(await page.locator('[data-typography-section="letterforms"] .vocabulary-term').evaluateAll(items => items.map(item => item.id).sort())).toEqual([...letterTerms].sort());
    await expect(page.locator('[data-typography-section="interface"] .vocabulary-term')).toHaveCount(14);
    expect(new Set(await page.locator('.vocabulary-term').evaluateAll(items => items.map(item => item.id))).size).toBe(21);
    await expect(page.locator('.vocabulary-pagination')).toBeEmpty();

    await page.locator('[data-slot="sidebar-inner"] a[href="#hyphenation"]').click();
    await expect(page.locator('#hyphenation')).toBeInViewport();
    await expect(page.locator('#hyphenation')).toHaveAttribute('data-selected', 'true');
    await page.locator('#hyphenation').getByRole('tab').last().click();
    await expect(page.locator('#hyphenation').getByRole('tab').last()).toHaveAttribute('aria-selected', 'true');
    await pane.evaluate(element => { element.scrollTop = 0; });
    await testInfo.attach(`Localized sections ${locale}`, { body: await page.screenshot(), contentType: 'image/png' });
    await testInfo.attach(`Section membership ${locale}`, {
      body: JSON.stringify(await sections.evaluateAll(items => items.map(item => ({
        id: item.getAttribute('data-typography-section'), terms: [...item.querySelectorAll('.vocabulary-term')].map(term => term.id),
      }))), null, 2), contentType: 'application/json',
    });
  });
}

test('localized sections reflow on mobile without clipping headings or cards', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const locale of locales) {
    await page.goto(`${localePath(locale, '/vocabulary/typography')}#subscript`);
    await expect(page.locator('.vocabulary-term')).toHaveCount(21);
    const clipped = await page.locator('.vocabulary-section-heading, .vocabulary-term').evaluateAll(items => items.filter(item => item.scrollWidth > item.clientWidth + 1).map(item => item.id || item.className));
    expect(clipped).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.locator('[data-slot="vocabulary-scroll"]').evaluate(element => { element.scrollTop = 0; });
    await testInfo.attach(`Localized sections ${locale} 320px`, { body: await page.screenshot(), contentType: 'image/png' });
  }
});

test('appending earlier sections preserves the visible card and its demo state', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/zh/vocabulary/typography#kerning');
  const pane = page.locator('[data-slot="vocabulary-scroll"]');
  await expect(page.locator('#kerning')).toBeInViewport();
  await page.locator('#kerning').getByRole('tab', { name: '开启', exact: true }).click();
  const before = await pane.evaluate(element => {
    element.scrollTop = element.scrollHeight;
    const top = element.getBoundingClientRect().top;
    const card = [...element.querySelectorAll<HTMLElement>('.vocabulary-term')].find(card => card.getBoundingClientRect().bottom > top + 24)!;
    return { id: card.id, offset: card.getBoundingClientRect().top - top };
  });
  await expect.poll(() => page.locator('.vocabulary-term').count()).toBeGreaterThanOrEqual(12);
  const after = await pane.evaluate((element, id) => document.getElementById(id)!.getBoundingClientRect().top - element.getBoundingClientRect().top, before.id);
  expect(after).toBeCloseTo(before.offset, 0);
  await expect(page.locator('#kerning').getByRole('tab', { name: '开启', exact: true })).toHaveAttribute('aria-selected', 'true');
  await testInfo.attach('Preserved reading position', { body: JSON.stringify({ before, after }), contentType: 'application/json' });
  await testInfo.attach('Appended sections on mobile', { body: await page.screenshot(), contentType: 'image/png' });
});

test('directory waits for hydration before accepting search input', async ({ page }, testInfo) => {
  let release!: () => void;
  const hydration = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/_next/static/**/*.js', async route => { await hydration; await route.continue(); });
  await page.goto('/zh/vocabulary/typography', { waitUntil: 'commit' });
  const search = page.locator('[data-slot="sidebar-inner"]').getByRole('searchbox');
  try { await expect(search).toBeDisabled(); }
  finally { release(); }
  await expect(search).toBeEnabled();
  await search.fill('CONTRAST');
  const result = page.locator('[data-slot="sidebar-inner"]').getByRole('link', { name: '对比度', exact: true });
  await expect(result).toHaveAttribute('href', '/zh/vocabulary/color#contrast-ratio');
  await expect(search).toHaveValue('CONTRAST');
  await testInfo.attach('Search after delayed hydration', { body: await page.locator('[data-slot="sidebar-inner"]').screenshot(), contentType: 'image/png' });
});
