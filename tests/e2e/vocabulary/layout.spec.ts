import { test, expect, type Locator, type Page } from '@playwright/test';
import { locales } from '../../../src/lib/i18n/config';
import { localePath } from '../../../src/lib/i18n/routing';

test.use({ reducedMotion: 'reduce' });
const path = '/zh/vocabulary/typography';

async function columns(page: Page) {
  return page.locator('.vocabulary-grid').first().evaluate(grid => {
    const cards = [...grid.children].map(card => card.getBoundingClientRect());
    return cards.filter(card => Math.abs(card.top - cards[0].top) < 1).length;
  });
}

async function clippedControls(page: Page) {
  return page.locator('.vocabulary-controls').evaluateAll(controls => controls.flatMap(control => {
    const bounds = control.closest('article')!.getBoundingClientRect();
    return [...control.querySelectorAll('[role="tab"], [role="slider"], select')].filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.left < bounds.left || rect.right > bounds.right || element.scrollWidth > element.clientWidth + 1;
    }).map(element => `${control.closest('article')!.id}: ${element.textContent || element.getAttribute('aria-valuetext')}`);
  }));
}

async function clippedSamples(page: Page) {
  return page.locator('.vocabulary-stage').evaluateAll(stages => stages.flatMap(stage => {
    const sample = stage.firstElementChild;
    if (!sample) return [];
    const bounds = stage.getBoundingClientRect();
    const content = sample.getBoundingClientRect();
    const left = content.left - bounds.left;
    const right = bounds.right - content.right;
    return left < 8 || right < 8 ? [{ term: stage.closest('article')!.id, left, right }] : [];
  }));
}

async function centeredSample(page: Page, id: string) {
  return page.locator(`#${id} .vocabulary-stage`).evaluate(stage => {
    const bounds = stage.getBoundingClientRect();
    const sample = stage.firstElementChild!.getBoundingClientRect();
    return {
      horizontal: Math.abs((sample.left + sample.right - bounds.left - bounds.right) / 2),
      vertical: Math.abs((sample.top + sample.bottom - bounds.top - bounds.bottom) / 2),
    };
  });
}

for (const width of [1280, 390]) {
  test(`heading scrolls with cards and resized profile stays centered at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(path);
    const heading = page.getByRole('heading', { level: 1, name: '文字排版' });
    const pane = page.locator('[data-slot="vocabulary-scroll"]');
    await expect(heading).toBeInViewport();
    const headingTop = (await heading.boundingBox())!.y;
    await pane.evaluate(element => { element.scrollTop = 200; });
    await expect.poll(async () => headingTop - (await heading.boundingBox())!.y).toBeCloseTo(200, 0);
    await expect(heading).not.toBeInViewport();
    await testInfo.attach(`Heading scrolled away ${width}px`, { body: await page.screenshot(), contentType: 'image/png' });

    await page.goto(`${path}#text-overflow`);
    const card = page.locator('#text-overflow');
    await expect(card).toBeInViewport();
    const slider = card.getByRole('slider');
    const preview = card.locator('.profile-width-preview');
    const offset = () => preview.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const stage = element.closest('.vocabulary-stage')!.getBoundingClientRect();
      return Math.abs((bounds.left + bounds.right - stage.left - stage.right) / 2);
    });
    await slider.focus();
    await slider.press('Home');
    await expect(slider).toHaveAttribute('aria-valuenow', '160');
    await expect.poll(offset).toBeLessThanOrEqual(1);
    await testInfo.attach(`Centered narrow profile ${width}px`, { body: await card.screenshot(), contentType: 'image/png' });
    await card.getByRole('tab', { name: '换行', exact: true }).click();
    await expect.poll(offset).toBeLessThanOrEqual(1);
    await slider.focus();
    await slider.press('End');
    await expect.poll(offset).toBeLessThanOrEqual(1);
    await testInfo.attach(`Centered wide profile ${width}px`, { body: await card.screenshot(), contentType: 'image/png' });
  });
}

async function scaleColumns(page: Page) {
  return page.locator('#type-scale .type-scale-sample').evaluate(sample => {
    const labels = [...sample.querySelectorAll('.type-scale-size')].map(label => label.getBoundingClientRect());
    const lines = [...sample.querySelectorAll('p')].map(line => line.getBoundingClientRect());
    return {
      labelsAligned: labels.every(label => Math.abs(label.right - labels[0].right) < 1),
      textAligned: lines.every(line => Math.abs(line.left - lines[0].left) < 1),
      labelsBeforeText: labels.every((label, index) => label.right < lines[index].left),
    };
  });
}

async function scaleTextFits(page: Page) {
  return page.locator('#type-scale .type-scale-sample p').evaluateAll(lines => lines.every(line => {
    const style = getComputedStyle(line);
    return line.scrollWidth <= line.clientWidth + 1 && line.getBoundingClientRect().height <= parseFloat(style.lineHeight) + 1;
  }));
}

async function profileLastLine(page: Page) {
  return page.locator('#widow .widow-sample').evaluate(bio => {
    const range = document.createRange();
    range.selectNodeContents(bio);
    return [...range.getClientRects()].at(-1)!.width;
  });
}

async function trackingAnnotation(page: Page) {
  return page.locator('#tracking .tracking-account-anchor').evaluate(anchor => {
    const svg = anchor.querySelector('svg')!;
    const label = anchor.querySelector<HTMLElement>('.handwritten-callout > span')!;
    const bounds = anchor.getBoundingClientRect();
    const tip = new DOMPoint(0, 56).matrixTransform(svg.getScreenCTM()!);
    const tail = new DOMPoint(80, 12).matrixTransform(svg.getScreenCTM()!);
    const textBounds = label.getBoundingClientRect();
    const stage = anchor.closest('.vocabulary-stage')!.getBoundingClientRect();
    const family = getComputedStyle(label).fontFamily.split(',')[0].replace(/["']/g, '').trim();
    return {
      horizontalError: Math.abs(tip.x - bounds.left - bounds.width / 2),
      verticalGap: bounds.top - tip.y,
      tailHorizontalError: Math.abs(tail.x - textBounds.left - textBounds.width / 2),
      tailVerticalGap: tail.y - textBounds.bottom,
      tipOffsetX: tip.x - stage.left,
      tipOffsetY: tip.y - stage.top,
      textOffsetX: textBounds.left - stage.left,
      textOffsetY: textBounds.top - stage.top,
      handwritingLoaded: [...document.fonts].some(font => font.family.replace(/["']/g, '') === family && font.status === 'loaded'),
    };
  });
}

for (const [width, count] of [[1440, 3], [1280, 3], [1100, 2], [768, 2], [640, 1], [390, 1], [320, 1]]) {
  test(`cards and controls fit in ${count} columns at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(`${path}#subscript`);
    await expect(page.locator('.vocabulary-term')).toHaveCount(21);
    await expect.poll(() => columns(page)).toBe(count);
    await page.evaluate(() => document.fonts.ready);
    expect(await clippedControls(page)).toEqual([]);
    expect(await clippedSamples(page)).toEqual([]);
    for (const id of ['leading', 'type-scale']) {
      const offset = await centeredSample(page, id);
      expect(offset.horizontal).toBeLessThanOrEqual(1);
      expect(offset.vertical).toBeLessThanOrEqual(1);
    }
    expect(await scaleColumns(page)).toEqual({ labelsAligned: true, textAligned: true, labelsBeforeText: true });
    expect(await scaleTextFits(page)).toBe(true);
    const annotation = await trackingAnnotation(page);
    expect(annotation.horizontalError).toBeLessThanOrEqual(1);
    expect(annotation.verticalGap).toBeCloseTo(4, 0);
    expect(annotation.tailHorizontalError).toBeLessThanOrEqual(1);
    expect(annotation.tailVerticalGap).toBeGreaterThan(0);
    expect(annotation.handwritingLoaded).toBe(true);
    await page.locator('#cap-height').getByRole('tab').last().click();
    for (const id of ['x-height', 'cap-height']) {
      const sample = page.locator(`#${id} .metrics-sample`);
      expect((await sample.boundingBox())!.width).toBeLessThanOrEqual(240);
      expect((await centeredSample(page, id)).horizontal).toBeLessThanOrEqual(1);
      if (id === 'x-height') {
        const label = (await sample.locator('.metrics-label').boundingBox())!;
        const plot = (await sample.locator('.metrics-plot').boundingBox())!;
        expect(label.y + label.height).toBeLessThan(plot.y);
      } else {
        await expect(sample.locator('.metrics-label')).toHaveCount(0);
        await expect(sample.locator('.metrics-baseline')).toBeEmpty();
      }
    }
    const overflowTabs = (await page.locator('#text-overflow').getByRole('tablist').boundingBox())!;
    const overflowRange = (await page.locator('#text-overflow .vocabulary-range').boundingBox())!;
    expect(overflowRange.y).toBeGreaterThan(overflowTabs.y + overflowTabs.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    if (width === 1100) {
      await page.locator('[data-slot="sidebar-trigger"]').click();
      await expect.poll(() => columns(page)).toBe(3);
      expect(await clippedControls(page)).toEqual([]);
      expect(await clippedSamples(page)).toEqual([]);
    }
    await page.locator('[data-slot="vocabulary-scroll"]').evaluate(element => { element.scrollTop = 0; });
    await testInfo.attach(`Typography layout ${width}px`, { body: await page.screenshot(), contentType: 'image/png' });
    if (width === 1280 || width === 390) {
      for (const id of ['kerning', 'tracking', 'leading', 'optical-kerning', 'tabular-nums', 'type-scale', 'weight', 'x-height', 'cap-height', 'clamp', 'widow', 'text-overflow']) {
        await testInfo.attach(`${id} sample ${width}px`, { body: await page.locator(`#${id}`).screenshot(), contentType: 'image/png' });
      }
    }
  });
}

test('three-column controls fit in every language and tabs support keyboard selection', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 960 });
  for (const locale of locales) {
    await page.goto(`${localePath(locale, '/vocabulary/typography')}#subscript`);
    await expect(page.locator('.vocabulary-term')).toHaveCount(21);
    expect(await columns(page)).toBe(3);
    expect(await page.locator('.vocabulary-card').evaluateAll(cards => cards.filter(card => {
      const style = getComputedStyle(card);
      return style.borderRadius !== '0px' || style.boxShadow !== 'none';
    }).map(card => card.closest('article')!.id))).toEqual([]);
    await page.evaluate(() => document.fonts.ready);
    expect(await clippedControls(page)).toEqual([]);
    expect(await clippedSamples(page)).toEqual([]);
    const capHeight = page.locator('#cap-height');
    await expect(capHeight.getByRole('tab')).toHaveCount(2);
    await expect(capHeight.locator('.metrics-label')).toHaveCount(0);
    await expect(capHeight.locator('.metrics-baseline')).toBeEmpty();
    await expect(capHeight.locator('.metrics-guide')).toBeVisible();
    const originalCapSize = await capHeight.locator('.cap-height-comparison').getAttribute('font-size');
    await capHeight.getByRole('tab').first().focus();
    await capHeight.getByRole('tab').first().press('ArrowRight');
    await expect(capHeight.locator('.cap-height-comparison')).not.toHaveAttribute('font-size', originalCapSize!);
    await testInfo.attach(`Localized cap height ${locale}`, { body: await capHeight.screenshot(), contentType: 'image/png' });
    const fontStack = page.locator('#font-stack');
    const stackTabs = fontStack.getByRole('tab');
    await expect(stackTabs).toHaveCount(3);
    await stackTabs.first().focus();
    await stackTabs.first().press('ArrowRight');
    await expect(stackTabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(fontStack.locator('.font-stack-sample > span')).toHaveCSS('font-family', /, serif$/);
    await testInfo.attach(`Localized font stack ${locale}`, { body: await fontStack.screenshot(), contentType: 'image/png' });
    const tabs = page.locator('#kerning').getByRole('tab');
    await tabs.first().focus();
    await tabs.first().press('ArrowRight');
    await expect(tabs.last()).toBeFocused();
    await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
    const panel = page.locator('#kerning').getByRole('tabpanel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('id', (await tabs.last().getAttribute('aria-controls'))!);
    const range = page.locator('#tracking').getByRole('slider');
    const originalAnnotation = await trackingAnnotation(page);
    await range.focus();
    await range.press('End');
    await expect(range).toHaveAttribute('aria-valuenow', '0.2');
    await expect(range).toHaveAccessibleName(/.+/);
    const annotation = await trackingAnnotation(page);
    for (const key of ['tipOffsetX', 'tipOffsetY', 'textOffsetX', 'textOffsetY'] as const) {
      expect(annotation[key]).toBeCloseTo(originalAnnotation[key], 1);
    }
    expect(annotation.horizontalError).toBeLessThanOrEqual(1);
    expect(annotation.verticalGap).toBeCloseTo(4, 0);
    expect(annotation.tailHorizontalError).toBeLessThanOrEqual(1);
    expect(annotation.tailVerticalGap).toBeGreaterThan(0);
    expect(annotation.handwritingLoaded).toBe(true);
    await testInfo.attach(`Tracking callout ${locale}`, { body: await page.locator('#tracking').screenshot(), contentType: 'image/png' });
    const scale = page.locator('#type-scale').getByRole('slider');
    for (const [key, value] of [['End', '1.5'], ['ArrowLeft', '1.49'], ['Home', '1.1']]) {
      await scale.focus();
      await scale.press(key);
      await expect(scale).toHaveAttribute('aria-valuenow', value);
      await expect.poll(() => scaleTextFits(page)).toBe(true);
    }
    const originalProfile = await profileLastLine(page);
    await page.locator('#widow').getByRole('tab').last().click();
    await expect.poll(() => profileLastLine(page)).toBeGreaterThan(originalProfile);
    await testInfo.attach(`Balanced profile ${locale}`, { body: await page.locator('#widow').screenshot(), contentType: 'image/png' });
    await testInfo.attach(`Single-line scale ${locale}`, { body: await page.locator('#type-scale').screenshot(), contentType: 'image/png' });
    await testInfo.attach(`Localized controls ${locale}`, { body: await page.screenshot(), contentType: 'image/png' });
  }
});

async function appearance(element: Locator) {
  return element.evaluate(element => {
    const style = getComputedStyle(element);
    return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'padding', 'gap', 'borderRadius', 'color', 'backgroundColor'].map(key => [key, style[key as keyof CSSStyleDeclaration]]));
  });
}

for (const width of [1440, 390]) {
  test(`dictionary directory matches neutral tutorial rows at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    const mobile = width < 961;
    const sidebar = page.locator(mobile ? '[data-mobile="true"]' : '[data-slot="sidebar-inner"]');
    await page.goto('/zh/courses/llm-101/what-is-a-token');
    if (mobile) await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
    const lesson = sidebar.locator('[data-slot="sidebar-menu-sub-button"][data-active="false"]').first();
    await expect(lesson).toBeVisible();
    const tutorial = {
      header: await appearance(sidebar.locator('[data-slot="sidebar-header"]')),
      entry: await appearance(lesson),
      number: await appearance(lesson.locator('span').first()),
      category: await appearance(sidebar.locator('[data-slot="sidebar-menu-button"]').first()),
    };
    await page.goto(path);
    if (mobile) await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
    const term = sidebar.locator('a[href="#kerning"]');
    await expect(term).toBeVisible();
    await expect(sidebar.locator('a[data-active="true"]')).toHaveCount(0);
    const dictionary = {
      header: await appearance(sidebar.locator('[data-slot="sidebar-header"]')),
      entry: await appearance(term),
      number: await appearance(term.locator('span').first()),
      category: await appearance(sidebar.locator('summary').first()),
    };
    expect(dictionary).toEqual(tutorial);
    await testInfo.attach(`Shared sidebar ${width}px`, { body: await sidebar.screenshot(), contentType: 'image/png' });
    await testInfo.attach('Sidebar style comparison', { body: JSON.stringify({ tutorial, dictionary }, null, 2), contentType: 'application/json' });
  });
}
