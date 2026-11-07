import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });

async function setRange(card: Locator, value: 'Home' | 'End') {
  const range = card.getByRole('slider');
  await range.focus();
  await range.press(value);
  const target = Number(await range.getAttribute(value === 'Home' ? 'aria-valuemin' : 'aria-valuemax'));
  await expect.poll(async () => Number.parseFloat((await range.getAttribute('aria-valuetext'))!)).toBe(target);
  // Wait for the range update to paint before comparing glyph geometry.
  await range.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function textWidth(element: Locator) {
  return element.evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect().width;
  });
}
async function decimalPosition(element: Locator) {
  return element.evaluate(element => {
    const text = element.firstChild!;
    const index = text.textContent!.indexOf('.');
    const range = document.createRange();
    range.setStart(text, index);
    range.setEnd(text, index + 1);
    return range.getBoundingClientRect().left;
  });
}
async function measure(element: Locator, axis: 'width' | 'height') {
  return element.evaluate((element, axis) => element.getBoundingClientRect()[axis], axis);
}
async function capMetrics(card: Locator) {
  return card.locator('.metrics-sample').evaluate(sample => {
    const context = document.createElement('canvas').getContext('2d')!;
    const measure = (selector: string) => {
      const word = sample.querySelector(selector)!;
      const style = getComputedStyle(word);
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      return { text: word.textContent, size: parseFloat(style.fontSize), family: style.fontFamily,
        height: context.measureText(word.textContent!).actualBoundingBoxAscent,
        width: (word as SVGTextElement).getComputedTextLength(),
        x: Number(word.getAttribute('x')), baseline: Number(word.getAttribute('y')) };
    };
    return { reference: measure('.cap-height-reference'), comparison: measure('.cap-height-comparison'),
      guideTop: parseFloat(getComputedStyle(sample.querySelector('.metrics-guide')!).top),
      plotWidth: sample.querySelector('.metrics-plot')!.getBoundingClientRect().width };
  });
}
async function lastLineWidth(element: Locator) {
  return element.evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return [...range.getClientRects()].at(-1)!.width;
  });
}

test('all 21 examples change their typography through accessible controls', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/zh/vocabulary/typography#subscript');
  await expect(page.locator('.vocabulary-term')).toHaveCount(21);
  await page.evaluate(() => document.fonts.ready);
  const card = (id: string) => page.locator(`#${id}`);
  const enable = async (id: string, name = '开启') => {
    const button = card(id).getByRole('tab', { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-selected', 'true');
  };
  const evidence: Record<string, unknown> = {};

  const word = card('kerning').locator('.kerning-words > div').first();
  await expect(word).toHaveText('AIDevCourse');
  const originalWord = await textWidth(word);
  await enable('kerning');
  await expect.poll(() => textWidth(word)).toBeLessThan(originalWord);
  const kernedWord = await textWidth(word);
  await expect(card('kerning').getByRole('slider')).toHaveCount(0);
  evidence.kerning = { originalWord, kernedWord };

  await setRange(card('tracking'), 'End');
  await expect(card('tracking').locator('.tracking-menu p').first()).toHaveCSS('letter-spacing', '2.4px');
  await setRange(card('leading'), 'Home');
  const tight = await measure(card('leading').locator('.demo-reading'), 'height');
  await setRange(card('leading'), 'End');
  await expect.poll(() => measure(card('leading').locator('.demo-reading'), 'height')).toBeGreaterThan(tight);
  const optical = card('optical-kerning').locator('.optical-word');
  const opticalGlyphs = optical.locator('.optical-glyphs');
  await expect(optical).toHaveAttribute('aria-label', 'MINIVAN');
  const opticalOriginal = await measure(opticalGlyphs, 'width');
  const spreadOriginal = Number(await optical.getAttribute('data-spread'));
  await enable('optical-kerning', '调整后');
  await expect.poll(() => measure(opticalGlyphs, 'width')).toBeLessThan(opticalOriginal - 20);
  // Optical spacing evens out the white space between letter shapes.
  await expect.poll(async () => Number(await optical.getAttribute('data-spread'))).toBeLessThan(spreadOriginal / 2);
  await expect(card('optical-kerning').getByRole('slider')).toHaveCount(0);
  await testInfo.attach('Optical spacing comparison', { body: await card('optical-kerning').screenshot(), contentType: 'image/png' });

  const numbers = card('tabular-nums').locator('.tabular-value');
  const proportional = [await textWidth(numbers.nth(0)), await textWidth(numbers.nth(1))];
  await enable('tabular-nums');
  const tabular = [await textWidth(numbers.nth(0)), await textWidth(numbers.nth(1))];
  expect(Math.abs(proportional[0] - proportional[1])).toBeGreaterThan(1);
  expect(Math.abs(tabular[0] - tabular[1])).toBeLessThan(1);
  await expect(numbers).toHaveCount(3);
  await expect(card('tabular-nums').locator('.tabular-total')).toHaveText('1,999.98');
  const decimals = await Promise.all([...Array(3)].map((_, index) => decimalPosition(numbers.nth(index))));
  decimals.push(await decimalPosition(card('tabular-nums').locator('.tabular-total')));
  expect(Math.max(...decimals) - Math.min(...decimals)).toBeLessThanOrEqual(1);
  evidence.numerals = { proportional, tabular, decimals, total: '1,999.98' };

  await setRange(card('type-scale'), 'Home');
  const small = await card('type-scale').locator('.type-scale-sample p').first().evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  await setRange(card('type-scale'), 'End');
  await expect.poll(() => card('type-scale').locator('.type-scale-sample p').first().evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(small);
  await expect(card('type-scale').locator('.type-scale-size')).toHaveText(['54 px', '24 px', '16 px']);
  for (const id of ['weight', 'variable-font']) {
    const sample = card(id).locator(id === 'weight' ? '.weight-title' : '.weight-sample');
    await setRange(card(id), 'End');
    await expect(sample).toHaveCSS('font-weight', '900');
    await setRange(card(id), 'Home');
    await expect(sample).toHaveCSS('font-weight', '100');
    if (id === 'weight') await expect(card(id).locator('.weight-body')).toHaveCSS('font-weight', '400');
  }
  const xHeight = card('x-height');
  await expect(xHeight.getByRole('tab')).toHaveText(['Geist', 'Georgia', 'Arial']);
  const guide = xHeight.locator('.metrics-guide');
  await expect(guide).toBeVisible();
  const initial = await guide.getAttribute('style');
  await xHeight.getByRole('tab', { name: 'Georgia', exact: true }).click();
  await expect(guide).not.toHaveAttribute('style', initial!);
  await expect(xHeight.locator('.metrics-sample')).toHaveCSS('font-family', /Georgia/);
  const capHeight = card('cap-height');
  await expect(capHeight.getByRole('tab')).toHaveText(['关闭', '开启']);
  await expect(capHeight.locator('.metrics-guide')).toBeVisible();
  const unmatched = await capMetrics(capHeight);
  expect(unmatched.reference.height - unmatched.comparison.height).toBeGreaterThan(3);
  await enable('cap-height');
  await expect(capHeight.locator('.metrics-guide')).toBeVisible();
  const matched = await capMetrics(capHeight);
  expect(Math.abs(matched.reference.height - matched.comparison.height)).toBeLessThanOrEqual(1);
  expect(matched.reference).toEqual(unmatched.reference);
  evidence.capHeight = { unmatched, matched };
  await enable('ligature');
  await expect(card('ligature').locator('.ligature-sample')).toHaveText('ﬁﬂ');
  await enable('font-smoothing');
  await expect(card('font-smoothing').getByRole('tab', { name: '开启', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(card('font-smoothing')).toContainText('部分设备上可能看不到差别');

  const overflow = card('text-overflow').locator('.overflow-bio');
  await expect(card('text-overflow').locator('.profile-name')).toHaveText('Alexandra Kim');
  await setRange(card('text-overflow'), 'Home');
  expect(await overflow.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  const oneLine = await measure(overflow, 'height');
  await card('text-overflow').getByRole('tab', { name: '换行', exact: true }).click();
  await expect.poll(() => measure(overflow, 'height')).toBeGreaterThan(oneLine);
  await setRange(card('text-overflow'), 'End');
  const profileWidth = await measure(card('text-overflow').locator('.profile-width-preview'), 'width');
  expect(profileWidth).toBeCloseTo(Number(await card('text-overflow').getByRole('slider').getAttribute('aria-valuenow')), 0);
  await testInfo.attach('Profile overflow wrapping', { body: await card('text-overflow').screenshot(), contentType: 'image/png' });
  await enable('hyphenation');
  await expect(card('hyphenation').locator('.hyphenation-sample')).toHaveCSS('hyphens', 'manual');
  await setRange(card('clamp'), 'Home');
  const minimum = await card('clamp').locator('.clamp-sample p').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  await expect(card('clamp').locator('.clamp-formula')).toHaveAttribute('data-mode', 'minimum');
  await testInfo.attach('Clamp minimum', { body: await card('clamp').screenshot(), contentType: 'image/png' });
  const clampRange = card('clamp').getByRole('slider');
  // 64px + 6 × 10px = 124px; 14cqi of 124px is 17.36px, inside the 16–32px range.
  for (let step = 0; step < 6; step++) await clampRange.press('PageUp');
  await expect(card('clamp').locator('.clamp-formula')).toHaveAttribute('data-mode', 'preferred');
  await expect(card('clamp').locator('.clamp-formula [data-active="true"]')).toHaveAttribute('data-arg', 'preferred');
  await expect.poll(() => card('clamp').locator('.clamp-sample p').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeCloseTo(17.36, 1);
  await testInfo.attach('Clamp fluid size', { body: await card('clamp').screenshot(), contentType: 'image/png' });
  await setRange(card('clamp'), 'End');
  const maximum = await card('clamp').locator('.clamp-sample p').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  expect(minimum).toBe(16);
  expect(maximum).toBeGreaterThan(minimum);
  expect(maximum).toBe(32);
  await expect(card('clamp').locator('.clamp-formula')).toHaveAttribute('data-mode', 'maximum');
  await expect(card('clamp').locator('.clamp-formula [data-active="true"]')).toHaveAttribute('data-arg', 'maximum');
  await expect(card('clamp').locator('.clamp-ghost')).toBeVisible();
  const renderedWidth = await measure(card('clamp').locator('.clamp-viewport'), 'width');
  expect(renderedWidth).toBeCloseTo(Number(await clampRange.getAttribute('aria-valuenow')), 0);
  evidence.clamp = { minimum, fluid: 17.36, maximum, renderedWidth };
  await testInfo.attach('Clamp maximum', { body: await card('clamp').screenshot(), contentType: 'image/png' });

  const widowBefore = await lastLineWidth(card('widow').locator('.widow-sample'));
  await testInfo.attach('Profile before balancing', { body: await card('widow').screenshot(), contentType: 'image/png' });
  await enable('widow', '调整后');
  await expect(card('widow').locator('.widow-sample')).toHaveCSS('text-wrap-style', 'balance');
  await expect.poll(() => lastLineWidth(card('widow').locator('.widow-sample'))).toBeGreaterThan(widowBefore);
  evidence.widow = { before: widowBefore, after: await lastLineWidth(card('widow').locator('.widow-sample')) };
  await testInfo.attach('Profile after balancing', { body: await card('widow').screenshot(), contentType: 'image/png' });
  await enable('orphan', '调整后');
  await expect(card('orphan').locator('.orphan-pages > div').first().locator('.orphan-first')).toHaveCount(0);
  await expect(card('orphan').locator('.orphan-pages > div').nth(1).locator('.orphan-first')).toHaveCount(1);
  await card('font-stack').getByRole('tab', { name: '等宽', exact: true }).click();
  await expect(card('font-stack').locator('.font-stack-sample > span')).toHaveCSS('font-family', /monospace/);
  await setRange(card('line-length'), 'Home');
  const narrow = await measure(card('line-length').locator('.demo-reading'), 'width');
  await setRange(card('line-length'), 'End');
  await expect.poll(() => measure(card('line-length').locator('.demo-reading'), 'width')).toBeGreaterThan(narrow);
  await enable('superscript');
  await expect(card('superscript').locator('sup')).toHaveText('2');
  await enable('subscript');
  await expect(card('subscript').locator('sub')).toHaveText('2');

  expect(errors).toEqual([]);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await testInfo.attach('Typography interaction measurements', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  await page.locator('[data-slot="sidebar-inner"] a[href="#kerning"]').click();
  await testInfo.attach('Working typography cards', { body: await page.screenshot(), contentType: 'image/png' });
});

for (const width of [1280, 390, 320]) {
  test(`refined examples keep three receipt rows, one account group and real font metrics at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto('/zh/vocabulary/typography#subscript');
    await expect(page.locator('.vocabulary-term')).toHaveCount(21);
    await expect(page.locator('.vocabulary-pagination')).toBeEmpty();
    const tracking = page.locator('#tracking');
    await expect(tracking.locator('.tracking-menu > div')).toHaveText(['个人资料', '安全设置', '通知']);
    await expect(tracking.locator('.tracking-menu > p')).toHaveCount(1);
    await setRange(tracking, 'End');
    await testInfo.attach(`Account tracking ${width}px`, { body: await tracking.screenshot(), contentType: 'image/png' });

    const receipt = page.locator('#tabular-nums');
    await expect(receipt.locator('.tabular-value')).toHaveText(['111.11', '888.88', '999.99']);
    await expect(receipt.locator('.tabular-total')).toHaveText('1,999.98');
    await testInfo.attach(`Three-item receipt ${width}px`, { body: await receipt.screenshot(), contentType: 'image/png' });

    const metrics = page.locator('#x-height');
    await expect(metrics.getByRole('tab')).toHaveText(['Geist', 'Georgia', 'Arial']);
    const heights = [];
    for (const [label, family] of [['Geist', 'Geist Variable'], ['Georgia', 'Georgia'], ['Arial', 'Arial']]) {
      await metrics.getByRole('tab', { name: label, exact: true }).click();
      const sample = metrics.locator('.metrics-sample');
      await expect(sample).toHaveCSS('font-family', new RegExp(family));
      const height = await sample.evaluate(async element => {
        const font = `96px ${getComputedStyle(element).fontFamily}`;
        await document.fonts.load(font, 'Hx');
        const context = document.createElement('canvas').getContext('2d')!;
        context.font = font;
        return Math.round(context.measureText('x').actualBoundingBoxAscent);
      });
      await expect(metrics.locator('.metrics-guide')).toHaveCSS('top', `${112 - height}px`);
      if (label === 'Geist') expect(await sample.evaluate((element, expectedFamily) => [...document.fonts].some(font => font.family.replace(/["']/g, '') === expectedFamily && font.status === 'loaded'), family)).toBe(true);
      heights.push({ label, family, height });
      await testInfo.attach(`X-height ${label} ${width}px`, { body: await metrics.screenshot(), contentType: 'image/png' });
    }
    await testInfo.attach('Measured font heights', { body: JSON.stringify(heights, null, 2), contentType: 'application/json' });

    const capHeight = page.locator('#cap-height');
    await expect(capHeight.getByRole('tab')).toHaveText(['关闭', '开启']);
    await expect(capHeight.locator('.metrics-guide')).toBeVisible();
    const unmatched = await capMetrics(capHeight);
    expect(unmatched.reference.text).toBe('New');
    expect(unmatched.comparison.text).toBe('Day');
    expect(unmatched.reference.size).toBe(unmatched.comparison.size);
    expect(unmatched.reference.height - unmatched.comparison.height).toBeGreaterThan(3);
    expect(unmatched.reference.baseline).toBe(unmatched.comparison.baseline);
    await testInfo.attach(`Cap height off ${width}px`, { body: await capHeight.screenshot(), contentType: 'image/png' });
    await capHeight.getByRole('tab').last().click();
    const matched = await capMetrics(capHeight);
    expect(Math.abs(matched.reference.height - matched.comparison.height)).toBeLessThanOrEqual(1);
    expect(matched.reference).toEqual(unmatched.reference);
    expect(matched.guideTop).toBe(unmatched.guideTop);
    expect(matched.comparison.baseline).toBe(matched.reference.baseline);
    expect(matched.comparison.size).toBeGreaterThan(unmatched.comparison.size);
    expect(matched.comparison.x).toBe(unmatched.comparison.x);
    expect(matched.reference.x).toBeGreaterThanOrEqual(0);
    expect(matched.comparison.x + matched.comparison.width).toBeLessThanOrEqual(matched.plotWidth);
    await testInfo.attach(`Cap height on ${width}px`, { body: await capHeight.screenshot(), contentType: 'image/png' });
    await testInfo.attach(`Cap height measurements ${width}px`, { body: JSON.stringify({ unmatched, matched }, null, 2), contentType: 'application/json' });
    await capHeight.getByRole('tab').last().press('ArrowLeft');
    await expect(capHeight.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true');
    expect(await capMetrics(capHeight)).toEqual(unmatched);

    const stack = page.locator('#font-stack');
    await expect(stack.getByRole('combobox')).toHaveCount(0);
    await expect(stack.getByRole('tab')).toHaveText(['无衬线', '衬线', '等宽']);
    for (const [family, label] of [['sans-serif', '无衬线'], ['serif', '衬线'], ['monospace', '等宽']]) {
      const tab = stack.getByRole('tab', { name: label, exact: true });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(stack.getByRole('tabpanel')).toHaveAttribute('id', (await tab.getAttribute('aria-controls'))!);
      await expect(stack.locator('.font-stack-sample > span')).toHaveCSS('font-family', new RegExp(`, ${family}$`));
      await expect(stack.locator('.font-stack-sample code')).toHaveText(`"Dictionary Missing Font", ${family}`);
      await testInfo.attach(`Font stack ${family} ${width}px`, { body: await stack.screenshot(), contentType: 'image/png' });
    }
  });
}
