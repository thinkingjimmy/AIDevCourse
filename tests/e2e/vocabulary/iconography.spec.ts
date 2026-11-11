import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { locales, htmlLanguages } from '../../../src/lib/i18n/config';
import { localePath } from '../../../src/lib/i18n/routing';
import { iconographyTerms } from '../../../src/lib/vocabulary/catalog';

test.use({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
const path = '/zh/vocabulary/iconography';

async function settle(element: Locator) {
  await element.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

test('iconography: English definitions preserve all 12 complete source entries', async ({ page }, testInfo) => {
  const source = JSON.parse(readFileSync('tests/e2e/vocabulary/fixtures/iconography-source.json', 'utf8'));
  await page.goto('/vocabulary/iconography#metaphor-accuracy');
  await expect(page.locator('.vocabulary-term')).toHaveCount(12);
  const evidence = [];
  for (const [id] of iconographyTerms) {
    await expect(page.locator(`#${id}-title`)).toHaveText(source.terms[id].title);
    const definition = await page.locator(`#${id} .vocabulary-definition`).innerText();
    const sha256 = createHash('sha256').update(definition).digest('hex');
    expect(sha256, `${id} must match the complete source text`).toBe(source.terms[id].sha256);
    evidence.push({ id, sha256 });
  }
  await testInfo.attach('Iconography source verification', { body: JSON.stringify({ url: source.url, terms: evidence }, null, 2), contentType: 'application/json' });
});

test('iconography: all examples change their drawing or meaning with keyboard controls', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${path}#metaphor-accuracy`);
  await expect(page.locator('.vocabulary-term')).toHaveCount(12);
  const card = (id: string) => page.locator(`#${id}`);
  const range = async (id: string, key: string) => {
    const slider = card(id).getByRole('slider');
    await slider.focus();
    await slider.press(key);
    await settle(slider);
  };
  const select = async (id: string, index: number) => {
    const tab = card(id).getByRole('tab').nth(index);
    await tab.focus();
    await tab.press('Enter');
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await settle(tab);
  };
  const evidence: Record<string, unknown> = {};

  const stroke = card('stroke-weight');
  const physicalWeights = () => stroke.locator('.icon-size-row path').evaluateAll(paths => paths.map(element => {
    const path = element as SVGPathElement;
    const weight = Number(getComputedStyle(path).strokeWidth.replace('px', ''));
    return getComputedStyle(path).vectorEffect === 'non-scaling-stroke' ? weight : weight * path.getScreenCTM()!.a;
  }));
  await range('stroke-weight', 'End');
  expect(await physicalWeights()).toEqual([3, 3, 3]);
  const mode = stroke.getByRole('tab').first();
  await mode.focus();
  await mode.press('ArrowRight');
  await expect(stroke.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
  await settle(stroke);
  expect(await physicalWeights()).toEqual([expect.closeTo(2, 3), expect.closeTo(3, 3), expect.closeTo(6, 3)]);
  evidence.strokeWeight = { fixed: [3, 3, 3], scaled: await physicalWeights() };
  await range('stroke-weight', 'Home');

  const optical = card('optical-centre');
  const frame = await optical.locator('.icon-centre-frame').last().boundingBox();
  const reference = await optical.locator('path').first().boundingBox();
  const before = await optical.locator('path').last().boundingBox();
  await select('optical-centre', 1);
  const after = await optical.locator('path').last().boundingBox();
  expect(after!.x - before!.x).toBeCloseTo(4, 1);
  expect(after!.y).toBe(before!.y);
  expect(await optical.locator('path').first().boundingBox()).toEqual(reference);
  expect(await optical.locator('.icon-centre-frame').last().boundingBox()).toEqual(frame);
  evidence.opticalCentre = { movedRight: after!.x - before!.x, frameUnchanged: true };

  const navigation = card('filled-vs-outlined').getByRole('button');
  await expect(navigation.nth(0)).toHaveAttribute('aria-pressed', 'true');
  for (const index of [1, 2, 0]) {
    await navigation.nth(index).focus();
    await navigation.nth(index).press('Space');
    await expect(card('filled-vs-outlined').locator('[aria-pressed=true]')).toHaveCount(1);
    for (let item = 0; item < 3; item++) {
      await expect(navigation.nth(item)).toHaveAttribute('aria-pressed', String(item === index));
      await expect(navigation.nth(item).locator('svg')).toHaveAttribute('data-filled', String(item === index));
    }
  }

  const caps = card('cap-style').locator('.icon-cap-sample');
  const square = await caps.screenshot();
  await select('cap-style', 1);
  for (const icon of await caps.locator('svg').all()) await expect(icon).toHaveAttribute('stroke-linecap', 'round');
  expect((await caps.screenshot()).equals(square)).toBe(false);

  const rasters = card('pixel-hinting').locator('canvas');
  const rasterEdges = () => rasters.evaluateAll(canvases => canvases.map(element => {
    const canvas = element as HTMLCanvasElement;
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, 16, 16).data;
    const alpha = Array.from(pixels).filter((_, index) => index % 4 === 3);
    return { width: canvas.width, height: canvas.height, partialPixels: alpha.filter(value => value > 0 && value < 255).length, solidPixels: alpha.filter(value => value === 255).length };
  }));
  await expect.poll(async () => (await rasterEdges())[0].partialPixels).toBeGreaterThan(0);
  const unaligned = await rasterEdges();
  expect(unaligned[0]).toEqual(unaligned[1]);
  await select('pixel-hinting', 1);
  const aligned = await rasterEdges();
  expect(aligned[0]).toEqual(unaligned[0]);
  expect(aligned[1].partialPixels).toBe(0);
  expect(aligned[1].solidPixels).toBeGreaterThan(0);
  await expect(rasters.last()).toHaveCSS('image-rendering', 'pixelated');
  evidence.pixelHinting = { unaligned, aligned };

  const library = card('icon-library').locator('.icon-library-row svg');
  const readSet = () => library.evaluateAll(icons => icons.map(icon => ({
    size: icon.getBoundingClientRect().width, weight: Number(icon.getAttribute('stroke-width')), join: icon.getAttribute('stroke-linejoin'),
  })));
  const mixed = await readSet();
  expect(new Set(mixed.map(icon => icon.size)).size).toBeGreaterThan(1);
  await select('icon-library', 1);
  expect(await readSet()).toEqual(Array.from({ length: 3 }, () => ({ size: 24, weight: 1.5, join: 'round' })));
  evidence.iconLibrary = { mixed, consistent: await readSet() };

  const sizes = card('icon-size-system');
  const sizeEvidence = [];
  for (const [index, size] of [12, 16, 20, 24, 48].entries()) {
    await select('icon-size-system', index);
    for (const icon of await sizes.locator('.icon-size-frame svg').all()) await expect(icon).toHaveAttribute('width', String(size));
    if (size === 12) {
      const bottomStrokes = await sizes.locator('.icon-size-frame path').evaluateAll(paths => paths.map(element => {
        const path = element as SVGPathElement;
        const { width } = path.ownerSVGElement!.viewBox.baseVal;
        return path.isPointInStroke(new DOMPoint(width / 2, width * 0.875));
      }));
      expect(bottomStrokes).toEqual([false, true]);
    }
    sizeEvidence.push({ size, adjustedWeight: await sizes.locator('.icon-size-drawing').getAttribute('stroke-width') });
  }
  evidence.sizeSystem = sizeEvidence;

  const meanings = card('meaning-collision').locator('.icon-meaning-list svg');
  expect(await meanings.evaluateAll(icons => icons.map(icon => icon.getAttribute('data-glyph')))).toEqual(['star', 'star']);
  await select('meaning-collision', 1);
  expect(await meanings.evaluateAll(icons => icons.map(icon => icon.getAttribute('data-glyph')))).toEqual(['heart', 'star']);

  const toggles = card('contextual-swap').getByRole('button');
  for (const button of await toggles.all()) {
    await button.focus();
    await button.press('Space');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button.locator('svg')).toHaveAttribute('data-filled', 'true');
  }
  await testInfo.attach('Consistent selected states', { body: await card('contextual-swap').screenshot(), contentType: 'image/png' });
  for (const button of await toggles.all()) {
    await button.press('Space');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button.locator('svg')).toHaveAttribute('data-filled', 'false');
  }

  const gapSample = card('breathing-room').locator('.icon-label-sample');
  const measuredGap = () => gapSample.evaluate(element => element.querySelector('span')!.getBoundingClientRect().left - element.querySelector('svg')!.getBoundingClientRect().right);
  expect(await measuredGap()).toBeCloseTo(7, 1);
  await range('breathing-room', 'Home');
  expect(await measuredGap()).toBeCloseTo(0, 1);
  await range('breathing-room', 'End');
  expect(await measuredGap()).toBeCloseTo(16, 1);
  await expect(gapSample.locator('svg')).toHaveAttribute('width', '24');
  evidence.breathingRoom = { minimum: 0, maximum: await measuredGap() };

  const weights = card('unified-weight').locator('.icon-weight-comparison');
  await expect(weights.locator('.icon-bold-label')).toHaveCSS('font-weight', '700');
  await range('unified-weight', 'End');
  await expect(weights.locator('svg').first()).toHaveAttribute('stroke-width', '1.5');
  await expect(weights.locator('svg').last()).toHaveAttribute('stroke-width', '3');
  await expect(weights.locator('.icon-bold-label')).toHaveCSS('font-weight', '700');

  const metaphors = card('metaphor-accuracy').locator('.icon-metaphors');
  for (const label of await metaphors.locator('span').all()) await expect(label).not.toBeVisible();
  await select('metaphor-accuracy', 1);
  for (const label of await metaphors.locator('span').all()) await expect(label).toBeVisible();
  expect(await metaphors.locator('svg').evaluateAll(icons => icons.map(icon => icon.getAttribute('data-glyph')))).toEqual(['save', 'phone', 'home']);

  for (const [id] of iconographyTerms) await testInfo.attach(`Iconography example ${id}`, { body: await card(id).screenshot(), contentType: 'image/png' });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
  await testInfo.attach('Iconography interaction measurements', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('iconography: shared search, category state and browser history preserve term links', async ({ page }, testInfo) => {
  await page.goto('/zh/vocabulary/color#blending');
  const sidebar = page.locator('[data-slot=sidebar-inner]');
  const search = sidebar.getByRole('searchbox');
  await search.fill('OPTICAL CENTRE');
  await sidebar.getByRole('link', { name: '视觉居中', exact: true }).click();
  await expect(page).toHaveURL(`${path}#optical-centre`);
  await expect(page.locator('#optical-centre')).toBeInViewport();
  await expect(search).toHaveValue('OPTICAL CENTRE');
  await page.goBack();
  await expect(page.locator('#blending')).toBeInViewport();
  await page.goForward();
  await expect(page.locator('#optical-centre')).toBeInViewport();
  await sidebar.getByRole('button', { name: '清除搜索' }).click();
  await expect(sidebar.locator('details').last()).toHaveAttribute('open');
  await expect(sidebar.locator('details[open]')).toHaveCount(1);
  await sidebar.locator('a[href="#stroke-weight"]').click();
  await expect(page.locator('.vocabulary-heading')).toBeInViewport();
  await testInfo.attach('Iconography directory', { body: await page.screenshot(), contentType: 'image/png' });
});

test('iconography: manual batches retain example state and focus newly loaded content', async ({ page }, testInfo) => {
  await page.addInitScript(() => Object.defineProperty(window, 'IntersectionObserver', { value: undefined }));
  await page.goto(path);
  await expect(page.locator('.vocabulary-term')).toHaveCount(6);
  const slider = page.locator('#stroke-weight').getByRole('slider');
  await slider.focus();
  await slider.press('End');
  const load = page.getByRole('button', { name: '加载更多', exact: true });
  await load.focus();
  await load.press('Enter');
  await expect(page.locator('.vocabulary-term')).toHaveCount(12);
  await expect(page.locator('#icon-size-system')).toBeFocused();
  await expect(slider).toHaveAttribute('aria-valuenow', '3');
  await expect(load).toHaveCount(0);
  await testInfo.attach('Iconography manual loading', { body: await page.screenshot(), contentType: 'image/png' });
});

for (const width of [1440, 390, 320]) {
  test(`iconography: cards and shared directory fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto('/zh/vocabulary/typography');
    if (width < 961) await page.locator('[data-slot=mobile-sidebar-trigger]').click();
    const sidebar = page.locator(width < 961 ? '[data-mobile=true]' : '[data-slot=sidebar-inner]');
    await sidebar.getByRole('searchbox').fill('metaphor');
    await sidebar.getByRole('link', { name: '隐喻准确性', exact: true }).click();
    await expect(page).toHaveURL(`${path}#metaphor-accuracy`);
    await expect(page.locator('#metaphor-accuracy')).toBeInViewport();
    await expect(page.locator('.vocabulary-term')).toHaveCount(12);
    if (width < 961) await expect(sidebar).not.toBeVisible();
    expect(await page.locator('.vocabulary-term, .vocabulary-controls, .icon-pair, .icon-state-nav').evaluateAll(elements => elements.filter(element => element.scrollWidth > element.clientWidth + 1).map(element => element.id || element.className))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.locator('[data-slot=vocabulary-scroll]').evaluate(element => { element.scrollTop = 0; });
    await testInfo.attach(`Iconography layout ${width}px`, { body: await page.screenshot(), contentType: 'image/png' });
  });
}

test('iconography: five locales publish definitions, metadata and stable language links', async ({ page, request }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const evidence = [];
  await page.setViewportSize({ width: 320, height: 900 });
  for (const locale of locales) {
    const messages = JSON.parse(readFileSync(`src/messages/vocabulary/${locale}.json`, 'utf8'));
    const url = localePath(locale, '/vocabulary/iconography');
    await page.goto(`${url}#metaphor-accuracy`);
    await expect(page.locator('html')).toHaveAttribute('lang', htmlLanguages[locale]);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages.iconography);
    await expect(page.locator('.vocabulary-term')).toHaveCount(12);
    for (const [id] of iconographyTerms) {
      await expect(page.locator(`#${id} .vocabulary-definition`)).toHaveText(messages.terms[id].description);
      for (const slider of await page.locator(`#${id}`).getByRole('slider').all()) await expect(slider).toHaveAccessibleName(/.+/);
    }
    expect(await page.locator('.vocabulary-term, .vocabulary-controls, .vocabulary-stage > div').evaluateAll(elements => elements.some(element => element.scrollWidth > element.clientWidth + 1))).toBe(false);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', new RegExp(`${url}$`));
    await expect(page.locator('link[rel=alternate][hreflang]')).toHaveCount(6);
    const contextual = page.locator('#contextual-swap').getByRole('button');
    await contextual.last().click();
    await expect(contextual.last()).toHaveText(messages.iconPreview.bookmarked);
    await expect(contextual.last()).toHaveAttribute('aria-pressed', 'true');
    await testInfo.attach(`Iconography narrow controls ${locale}`, { body: await page.locator('#contextual-swap').screenshot(), contentType: 'image/png' });
    await page.locator('.language-picker summary').click();
    await page.locator(`.language-options a[hreflang="${htmlLanguages.en}"]`).click();
    await expect(page).toHaveURL('/vocabulary/iconography#metaphor-accuracy');
    await expect(page.locator('#metaphor-accuracy')).toBeInViewport();
    evidence.push({ locale, url, terms: 12 });
  }
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const locale of locales) expect(sitemap).toContain(localePath(locale, '/vocabulary/iconography'));
  expect(errors).toEqual([]);
  await testInfo.attach('Iconography locales and routes', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('iconography: all definitions and native category links work without JavaScript', async ({ browser, baseURL }, testInfo) => {
  const messages = JSON.parse(readFileSync('src/messages/vocabulary/zh.json', 'utf8'));
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.locator('.vocabulary-term, .vocabulary-static')).toHaveCount(12);
    await page.locator('.vocabulary-native-directory summary').click();
    await page.locator('.vocabulary-native-directory a[href="#metaphor-accuracy"]').click();
    await expect(page.locator('#metaphor-accuracy')).toBeInViewport();
    await expect(page.locator('#metaphor-accuracy')).toContainText(messages.terms['metaphor-accuracy'].description);
    await testInfo.attach('Iconography without JavaScript', { body: await page.screenshot(), contentType: 'image/png' });
    await page.locator('[data-slot=vocabulary-scroll]').evaluate(element => { element.scrollTop = 0; });
    await page.locator('.vocabulary-native-directory a[href="/zh/vocabulary/color#srgb"]').click();
    await expect(page).toHaveURL('/zh/vocabulary/color#srgb');
    await expect(page.locator('#srgb')).toBeInViewport();
  } finally { await context.close(); }
});
