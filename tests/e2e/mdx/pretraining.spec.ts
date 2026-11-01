import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const lesson = '/zh/courses/llm-101/how-language-models-are-trained';

async function capture(figure: Locator, name: string) {
  await figure.scrollIntoViewIfNeeded();
  const path = test.info().outputPath(`${name}.png`);
  await figure.screenshot({ path, animations: 'disabled', style: 'header, .mobile-course-bar, button.sticky { visibility: hidden !important; }' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

async function inspectLayout(figure: Locator) {
  return figure.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const images = [...element.querySelectorAll<HTMLImageElement>('[data-pretraining-illustration] img')]
      .filter((image) => image.getBoundingClientRect().width > 0)
      .map((image) => {
        const box = image.getBoundingClientRect();
        return {
          alt: image.alt, loaded: image.complete && image.naturalWidth > 0,
          width: box.width, height: box.height,
          insideFrame: box.left >= bounds.left && box.right <= bounds.right,
        };
      });
    const tabs = [...element.querySelectorAll('[role="tab"]')].map((tab) => ({
      cursor: getComputedStyle(tab).cursor, height: tab.getBoundingClientRect().height,
    }));
    return { height: bounds.height, images, tabs };
  });
}

test.describe('Pretraining overview', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'The overview belongs to the published catalog.');

  for (const scenario of [
    { name: 'desktop', width: 1280, height: 960 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'narrow', width: 320, height: 844 },
    { name: 'enlarged', width: 320, height: 960 },
  ]) {
    test(`three steps work on ${scenario.name}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setViewportSize(scenario);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      expect((await page.goto(lesson))?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
      const figure = page.getByRole('figure', { name: '预训练的大致流程', exact: true });
      const tabs = figure.getByRole('tab');
      await expect(tabs).toHaveText(['01筛选和清洗', '02转为 Token', '03预测训练']);
      await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
      await expect(figure.getByRole('img')).toHaveCount(1);
      await expect(figure.getByRole('img')).toHaveAttribute('alt', /代码库.*去重.*训练文本/);
      await expect.poll(() => figure.locator('[data-pretraining-illustration] img').evaluateAll((images) =>
        images.length === 3 && images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0),
      )).toBe(true);
      await expect(figure.locator('figcaption')).toHaveCount(0);
      await capture(figure, `pretraining-cleaning-${scenario.name}`);
      const evidence = [await inspectLayout(figure)];
      const sources = [await figure.getByRole('img').getAttribute('src')];

      await tabs.first().focus();
      await tabs.first().press('ArrowRight');
      await expect(tabs.nth(1)).toBeFocused();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
      await expect(figure.getByRole('img')).toHaveCount(1);
      await expect(figure.getByRole('img')).toHaveAttribute('alt', /今天广州的天气如何？.*47256.*132426.*1616.*167823.*24608.*4802/);
      await capture(figure, `pretraining-tokens-${scenario.name}`);
      evidence.push(await inspectLayout(figure));
      sources.push(await figure.getByRole('img').getAttribute('src'));

      await tabs.nth(2).click();
      await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
      await expect(figure.getByRole('img')).toHaveCount(1);
      await expect(figure.getByRole('img')).toHaveAttribute('alt', /预测下一个 Token.*对照原文.*调整参数.*再次预测/);
      await capture(figure, `pretraining-cycle-${scenario.name}`);
      evidence.push(await inspectLayout(figure));
      sources.push(await figure.getByRole('img').getAttribute('src'));
      expect(new Set(sources).size).toBe(3);
      expect(Math.max(...evidence.map((item) => item.height)) - Math.min(...evidence.map((item) => item.height))).toBeLessThanOrEqual(1);
      if (scenario.name === 'desktop') {
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
        await capture(figure, 'pretraining-cycle-after-resize');
        evidence.push(await inspectLayout(figure));
      }
      for (const measurement of evidence) {
        expect(measurement.images).toHaveLength(1);
        expect(measurement.images[0].loaded && measurement.images[0].insideFrame).toBe(true);
        expect(measurement.images[0].width / measurement.images[0].height).toBeCloseTo(16 / 9, 2);
        expect(measurement.tabs.every((tab) => tab.cursor === 'pointer' && tab.height >= 44)).toBe(true);
      }
      const accessibility = await new AxeBuilder({ page }).include('[data-pretraining-overview]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await tabs.nth(2).focus();
      await tabs.nth(2).press('Home');
      await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
      await tabs.first().press('End');
      await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
      await expect(figure.getByRole('img')).toHaveAttribute('alt', /调整参数/);
      await tabs.nth(2).press('ArrowLeft');
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      await test.info().attach('pretraining-layout', { body: JSON.stringify({ evidence, sources, errors }, null, 2), contentType: 'application/json' });
    });
  }

  test('readers can enlarge an illustration and return with Escape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(lesson);
    const figure = page.getByRole('figure', { name: '预训练的大致流程', exact: true });
    const zoom = figure.getByRole('button', { name: '放大筛选和清洗图解', exact: true });
    await zoom.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const path = test.info().outputPath('pretraining-image-zoom.png');
    await page.screenshot({ path, animations: 'disabled' });
    await test.info().attach('Enlarged pretraining illustration', { path, contentType: 'image/png' });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(zoom).toBeFocused();
    await figure.getByRole('tab').nth(1).click();
    await expect(figure.getByRole('img')).toHaveAttribute('alt', /Tokenizer/);
  });

  test('all stages remain readable without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
    try {
      const page = await context.newPage();
      await page.goto(lesson);
      const figure = page.getByRole('figure', { name: '预训练的大致流程', exact: true });
      await expect(figure.getByRole('list', { name: '预训练的完整流程' })).toBeVisible();
      await expect(figure.getByText('01 筛选和清洗', { exact: true })).toBeVisible();
      await expect(figure.getByText('02 转为 Token', { exact: true })).toBeVisible();
      await expect(figure.getByText('03 预测训练', { exact: true })).toBeVisible();
      await expect(figure.getByRole('tablist')).toHaveCount(0);
      await expect(figure.getByRole('img')).toHaveCount(3);
      for (const image of await figure.getByRole('img').all()) {
        await expect(image).toBeVisible();
        await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
      }
      expect((await inspectLayout(figure)).images.every((image) => image.loaded && image.insideFrame)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await capture(figure, 'pretraining-no-javascript');
    } finally { await context.close(); }
  });
});
