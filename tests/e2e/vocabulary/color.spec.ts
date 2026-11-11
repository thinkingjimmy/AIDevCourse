import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { locales } from '../../../src/lib/i18n/config';
import { localePath } from '../../../src/lib/i18n/routing';
import { colorTerms } from '../../../src/lib/vocabulary/catalog';

test.use({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
const path = '/zh/vocabulary/color';

async function colors(elements: Locator, property: 'color' | 'backgroundColor' | 'borderTopColor' = 'backgroundColor') {
  return elements.evaluateAll((elements, property) => elements.map(element => {
    const context = document.createElement('canvas').getContext('2d')!;
    context.fillStyle = getComputedStyle(element)[property];
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data];
  }), property);
}

test('all English color definitions preserve the complete source text', async ({ page }, testInfo) => {
  const source = JSON.parse(readFileSync('tests/e2e/vocabulary/fixtures/color-source.json', 'utf8'));
  await page.goto('/vocabulary/color#blending');
  await expect(page.locator('.vocabulary-term')).toHaveCount(13);
  const evidence = [];
  for (const [id] of colorTerms) {
    await expect(page.locator(`#${id}-title`)).toHaveText(source.terms[id].title);
    const definition = await page.locator(`#${id} .vocabulary-definition`).innerText();
    const hash = createHash('sha256').update(definition).digest('hex');
    expect(hash, `${id} must match the source without shortening or paraphrasing`).toBe(source.terms[id].sha256);
    evidence.push({ id, hash });
  }
  await testInfo.attach('Verbatim source verification', { body: JSON.stringify({ url: source.url, terms: evidence }, null, 2), contentType: 'application/json' });
});

test('all 13 color examples demonstrate their behavior with keyboard controls', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${path}#blending`);
  await expect(page.locator('.vocabulary-term')).toHaveCount(13);
  const card = (id: string) => page.locator(`#${id}`);
  const range = async (id: string, key: string, index = 0) => {
    const slider = card(id).getByRole('slider').nth(index);
    await slider.focus();
    await slider.press(key);
    await slider.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  };
  const select = async (id: string, index: number) => {
    const tab = card(id).getByRole('tab').nth(index);
    await tab.focus();
    await tab.press('Enter');
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await tab.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  };
  const evidence: Record<string, unknown> = {};

  for (let channel = 0; channel < 3; channel++) await range('srgb', 'Home', channel);
  await expect(card('srgb').locator('code')).toHaveText('#000000');
  expect(await colors(card('srgb').locator('.color-swatch'))).toEqual([[0, 0, 0, 255]]);
  for (let channel = 0; channel < 3; channel++) await range('srgb', 'End', channel);
  await expect(card('srgb').locator('code')).toHaveText('#ffffff');
  expect(await colors(card('srgb').locator('.color-swatch'))).toEqual([[255, 255, 255, 255]]);
  await range('srgb', 'Home', 0);

  const p3Before = await colors(card('p3').locator('.color-disc'));
  await select('p3', 1);
  const p3After = await colors(card('p3').locator('.color-disc'));
  expect(p3After).not.toEqual(p3Before);
  const p3Display = await page.evaluate(() => matchMedia('(color-gamut: p3)').matches);
  if (!p3Display) expect(p3After[0]).toEqual(p3After[1]);
  evidence.p3 = { p3Display, before: p3Before, after: p3After };

  const palette = (space: string) => card('oklch').locator(`[data-space=${space}] .color-palette span`);
  const luminance = (rgba: number[]) => rgba.slice(0, 3).map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const hslLightness = (await colors(palette('hsl'))).map(luminance);
  const oklchLightness = (await colors(palette('oklch'))).map(luminance);
  const spread = (values: number[]) => Math.max(...values) - Math.min(...values);
  expect(spread(oklchLightness)).toBeLessThan(spread(hslLightness) / 3);
  await range('oklch', 'Home');
  const lowerLightness = (await colors(palette('oklch'))).map(luminance);
  await range('oklch', 'End');
  const higherLightness = (await colors(palette('oklch'))).map(luminance);
  expect(Math.min(...higherLightness)).toBeGreaterThan(Math.max(...lowerLightness));
  evidence.oklch = { hslLightness, oklchLightness, lowerLightness, higherLightness };

  const alpha = card('alpha').locator('.color-alpha-border');
  const textBefore = await colors(alpha, 'color');
  const solid = await colors(card('alpha').locator('.color-solid-border'), 'borderTopColor');
  await range('alpha', 'Home');
  expect((await colors(alpha, 'borderTopColor'))[0][3]).toBe(0);
  await range('alpha', 'End');
  expect((await colors(alpha, 'borderTopColor'))[0][3]).toBe(255);
  expect(await colors(alpha, 'color')).toEqual(textBefore);
  const tintedSurface = await colors(card('alpha').locator('.color-border-pair'));
  await select('alpha', 0);
  expect(await colors(card('alpha').locator('.color-border-pair'))).not.toEqual(tintedSurface);
  expect(await colors(card('alpha').locator('.color-solid-border'), 'borderTopColor')).toEqual(solid);
  await select('alpha', 1);
  for (let step = 0; step < 5; step++) await range('alpha', 'PageDown');

  const token = card('semantic-token');
  const borders = token.locator('.color-token-border');
  await expect(borders).toHaveCount(3);
  expect(await colors(borders, 'borderTopColor')).toEqual(Array.from({ length: 3 }, () => [224, 224, 224, 255]));
  await select('semantic-token', 1);
  const updatedBorders = await colors(borders, 'borderTopColor');
  expect(updatedBorders).toEqual(Array.from({ length: 3 }, () => [125, 135, 145, 255]));
  await expect(token.locator('code')).toContainText('--color-border-subtle');
  evidence.semanticToken = { borderCount: 3, updatedBorders };

  const contrast = card('contrast-ratio');
  for (let step = 0; step < 22; step++) await range('contrast-ratio', 'ArrowRight');
  await expect(contrast.locator('.color-contrast-ratio')).toHaveText('4.54:1');
  await expect(contrast.locator('.color-contrast-results span').first()).toHaveAttribute('data-passes', 'true');
  await range('contrast-ratio', 'ArrowRight');
  await expect(contrast.locator('.color-contrast-ratio')).toHaveText('4.47:1');
  await expect(contrast.locator('.color-contrast-results span').first()).toHaveAttribute('data-passes', 'false');
  await expect(contrast.locator('.color-contrast-results span').last()).toHaveAttribute('data-passes', 'true');
  await testInfo.attach('Contrast below the body-text threshold', { body: await contrast.screenshot(), contentType: 'image/png' });
  for (let step = 0; step < 29; step++) await range('contrast-ratio', 'ArrowRight');
  await expect(contrast.locator('.color-contrast-ratio')).toHaveText('3.03:1');
  await expect(contrast.locator('[data-passes=true]')).toHaveCount(2);
  await range('contrast-ratio', 'ArrowRight');
  await expect(contrast.locator('.color-contrast-ratio')).toHaveText('2.99:1');
  await expect(contrast.locator('[data-passes=false]')).toHaveCount(3);
  await range('contrast-ratio', 'End');
  await expect(contrast.locator('.color-contrast-ratio')).toHaveText('1.00:1');
  await expect(contrast.locator('[data-passes=false]')).toHaveCount(3);
  await range('contrast-ratio', 'Home');
  await expect(contrast.locator('.color-contrast-ratio')).toHaveText('21.00:1');
  await expect(contrast.locator('[data-passes=true]')).toHaveCount(3);
  evidence.contrast = { gray118: '4.54:1 / body pass', gray119: '4.47:1 / body fail', gray148: '3.03:1 / large text and UI pass', gray149: '2.99:1 / large text and UI fail', black: '21.00:1', white: '1.00:1' };

  expect(await colors(card('tinted-neutral').locator('.color-pure-neutral'))).toEqual([[128, 128, 128, 255]]);
  const warmGray = await colors(card('tinted-neutral').locator('.color-tinted-neutral'));
  await select('tinted-neutral', 1);
  expect(await colors(card('tinted-neutral').locator('.color-tinted-neutral'))).not.toEqual(warmGray);
  expect(await colors(card('tinted-neutral').locator('.color-pure-neutral'))).toEqual([[128, 128, 128, 255]]);

  await expect(card('saturation').getByRole('slider')).toHaveAttribute('aria-valuenow', '75');
  const saturationSwatches = card('saturation').locator('.color-saturation-surface span');
  const fullSaturation = (await colors(saturationSwatches))[0];
  await range('saturation', 'Home');
  const grays = (await colors(saturationSwatches))[1];
  expect(grays[0]).toBe(grays[1]);
  expect(grays[1]).toBe(grays[2]);
  await range('saturation', 'End');
  expect(await colors(saturationSwatches)).toEqual([fullSaturation, fullSaturation]);
  for (let step = 0; step < 25; step++) await range('saturation', 'ArrowLeft');
  const reducedSaturation = await colors(saturationSwatches);
  expect(reducedSaturation[0]).toEqual(fullSaturation);
  expect(reducedSaturation[1]).not.toEqual(fullSaturation);
  evidence.saturation = { values: [100, 75], colors: reducedSaturation };

  await range('chroma', 'Home');
  const chromaSwatch = card('chroma').locator('.color-chroma-swatch');
  const opacitySwatch = card('chroma').locator('.color-opacity-swatch');
  expect(await colors(chromaSwatch)).toEqual(await colors(opacitySwatch));
  await expect(opacitySwatch).toHaveCSS('opacity', '1');
  const originalChroma = await colors(chromaSwatch);
  await range('chroma', 'End');
  expect(await colors(chromaSwatch)).not.toEqual(originalChroma);
  expect(await colors(opacitySwatch)).toEqual(originalChroma);
  await expect(chromaSwatch).toHaveCSS('opacity', '1');
  await expect(opacitySwatch).toHaveCSS('opacity', '0.25');
  const chromaBackgrounds = await colors(card('chroma').locator('.color-chroma-surface'));
  expect(chromaBackgrounds[0]).toEqual(chromaBackgrounds[1]);

  const stops = card('gradient').locator('.color-gradient-stops > div > span:first-child');
  const srgb = await colors(stops);
  await select('gradient', 1);
  const oklchStops = await colors(stops);
  expect(oklchStops[0]).toEqual(srgb[0]);
  expect(oklchStops[2]).toEqual(srgb[2]);
  expect(oklchStops[1]).not.toEqual(srgb[1]);
  evidence.gradient = { srgb, oklch: oklchStops };

  const visibility = card('opacity-vs-visibility');
  const area = visibility.locator('.color-hit-area');
  const originalSize = await area.evaluate(element => [element.clientWidth, element.clientHeight]);
  await area.click();
  await expect(visibility.locator('output')).toHaveText('已点击 1 次');
  await visibility.locator('button.color-hidden-button').focus();
  await page.keyboard.press('Enter');
  await expect(visibility.locator('output')).toHaveText('已点击 2 次');
  await expect(area).toHaveCSS('outline-style', 'solid');
  await select('opacity-vs-visibility', 1);
  await area.click();
  await expect(visibility.locator('output')).toHaveText('已点击 2 次');
  await expect(visibility.getByRole('button', { name: '测试不可见按钮' })).toHaveCount(0);
  expect(await area.evaluate(element => [element.clientWidth, element.clientHeight])).toEqual(originalSize);
  evidence.visibility = { clicks: 2, reservedSize: originalSize };

  const theme = card('dark-mode').locator('.color-theme');
  const lightCanvas = await colors(theme);
  await select('dark-mode', 1);
  expect(await colors(theme)).not.toEqual(lightCanvas);
  const layers = await colors(card('dark-mode').locator('.color-theme, .color-theme-surface, .color-theme-raised'));
  expect(layers[0][0]).toBeLessThan(layers[1][0]);
  expect(layers[1][0]).toBeLessThan(layers[2][0]);
  evidence.darkLayers = layers;

  const blend = card('blending').locator('.color-blend');
  const overlap = await blend.screenshot();
  await select('blending', 1);
  await expect(card('blending').locator('.color-blend-top')).toHaveCSS('mix-blend-mode', 'screen');
  expect((await blend.screenshot()).equals(overlap)).toBe(false);
  await select('blending', 2);
  await expect(card('blending').locator('.color-blend-top')).toHaveCSS('mix-blend-mode', 'overlay');
  expect((await blend.screenshot()).equals(overlap)).toBe(false);

  for (const [id] of colorTerms) await testInfo.attach(`Color example ${id}`, { body: await card(id).screenshot(), contentType: 'image/png' });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
  await testInfo.attach('Color interaction evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('cross-category search retains the query and restores anchors through browser history', async ({ page }, testInfo) => {
  await page.goto('/zh/vocabulary/typography#subscript');
  const sidebar = page.locator('[data-slot=sidebar-inner]');
  const search = sidebar.getByRole('searchbox');
  await search.fill('CONTRAST');
  const link = sidebar.getByRole('link', { name: '对比度', exact: true });
  await expect(link).toHaveAttribute('href', `${path}#contrast-ratio`);
  await link.click();
  await expect(page).toHaveURL(`${path}#contrast-ratio`);
  await expect(page.locator('#contrast-ratio')).toBeInViewport();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('色彩');
  await expect(search).toHaveValue('CONTRAST');
  await page.goBack();
  await expect(page.locator('#subscript')).toBeInViewport();
  await expect(page.locator('.vocabulary-term')).toHaveCount(21);
  await expect(search).toHaveValue('CONTRAST');
  await page.goForward();
  await expect(page.locator('#contrast-ratio')).toBeInViewport();
  await sidebar.getByRole('button', { name: '清除搜索' }).click();
  await expect(sidebar.locator('details').first()).not.toHaveAttribute('open');
  await expect(sidebar.locator('details').filter({ has: page.locator('a[href="#srgb"]') })).toHaveAttribute('open');
  await sidebar.locator('a[href="#srgb"]').click();
  await expect(page.locator('.vocabulary-heading')).toBeInViewport();
  await testInfo.attach('Color category and shared directory', { body: await page.screenshot(), contentType: 'image/png' });
});

test('color batches preserve demo state and support manual loading', async ({ page }, testInfo) => {
  await page.addInitScript(() => Object.defineProperty(window, 'IntersectionObserver', { value: undefined }));
  await page.goto(path);
  await expect(page.locator('.vocabulary-term')).toHaveCount(6);
  const slider = page.locator('#srgb').getByRole('slider').first();
  await slider.focus();
  await slider.press('End');
  const load = page.getByRole('button', { name: '加载更多', exact: true });
  await load.click();
  await expect(page.locator('.vocabulary-term')).toHaveCount(12);
  await expect(page.locator('#tinted-neutral')).toBeFocused();
  await load.click();
  await expect(page.locator('.vocabulary-term')).toHaveCount(13);
  await expect(page.locator('#blending')).toBeFocused();
  await expect(load).toHaveCount(0);
  await expect(slider).toHaveAttribute('aria-valuenow', '255');
  await testInfo.attach('Last color batch', { body: await page.screenshot(), contentType: 'image/png' });
});

for (const width of [1440, 390, 320]) {
  test(`color cards fit and their directory works at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto('/zh/vocabulary/typography');
    if (width < 961) await page.locator('[data-slot=mobile-sidebar-trigger]').click();
    const sidebar = page.locator(width < 961 ? '[data-mobile=true]' : '[data-slot=sidebar-inner]');
    await sidebar.getByRole('searchbox').fill('blending');
    await sidebar.getByRole('link', { name: '颜色混合', exact: true }).click();
    await expect(page).toHaveURL(`${path}#blending`);
    await expect(page.locator('#blending')).toBeInViewport();
    await expect(page.locator('.vocabulary-term')).toHaveCount(13);
    if (width < 961) await expect(sidebar).not.toBeVisible();
    expect(await page.locator('.vocabulary-term, .vocabulary-controls').evaluateAll(elements => elements.filter(element => element.scrollWidth > element.clientWidth + 1).map(element => element.id || element.className))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.locator('[data-slot=vocabulary-scroll]').evaluate(element => { element.scrollTop = 0; });
    await testInfo.attach(`Color layout ${width}px`, { body: await page.screenshot(), contentType: 'image/png' });
  });
}

test('five locales publish color terms, metadata, language links and usable narrow controls', async ({ page, request }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const evidence = [];
  await page.setViewportSize({ width: 320, height: 900 });
  for (const locale of locales) {
    const messages = JSON.parse(readFileSync(`src/messages/vocabulary/${locale}.json`, 'utf8'));
    const url = localePath(locale, '/vocabulary/color');
    await page.goto(`${url}#blending`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages.color);
    await expect(page.locator('.vocabulary-term')).toHaveCount(13);
    for (const [id] of colorTerms) {
      await expect(page.locator(`#${id} .vocabulary-definition`)).toHaveText(messages.terms[id].description);
      for (const control of await page.locator(`#${id}`).getByRole('slider').all()) await expect(control).toHaveAccessibleName(/.+/);
    }
    expect(await page.locator('.vocabulary-term, .vocabulary-controls').evaluateAll(elements => elements.some(element => element.scrollWidth > element.clientWidth + 1))).toBe(false);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', new RegExp(`${url}$`));
    await expect(page.locator('link[rel=alternate][hreflang]')).toHaveCount(6);
    await page.locator('.language-picker summary').click();
    await page.locator('.language-options a').filter({ hasText: 'English' }).click();
    await expect(page).toHaveURL('/vocabulary/color#blending');
    await expect(page.locator('#blending')).toBeInViewport();
    evidence.push({ locale, url, terms: 13 });
  }
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const locale of locales) expect(sitemap).toContain(localePath(locale, '/vocabulary/color'));
  expect(errors).toEqual([]);
  await testInfo.attach('Color translations and routes', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('all color definitions and cross-category links work without JavaScript', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.locator('.vocabulary-term, .vocabulary-static')).toHaveCount(13);
    await page.locator('.vocabulary-native-directory summary').click();
    await page.locator('.vocabulary-native-directory a[href="#blending"]').click();
    await expect(page.locator('#blending')).toBeInViewport();
    await testInfo.attach('Color definitions without JavaScript', { body: await page.screenshot(), contentType: 'image/png' });
    await page.locator('[data-slot=vocabulary-scroll]').evaluate(element => { element.scrollTop = 0; });
    await page.locator('.vocabulary-native-directory a[href="/zh/vocabulary/typography#kerning"]').click();
    await expect(page).toHaveURL('/zh/vocabulary/typography#kerning');
    await expect(page.locator('#kerning')).toBeInViewport();
  } finally { await context.close(); }
});
