import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const lesson = '/zh/courses/llm-101/how-language-models-are-trained-part-1';

async function capture(figure: Locator, name: string) {
  await figure.scrollIntoViewIfNeeded();
  const path = test.info().outputPath(`${name}.png`);
  await figure.screenshot({ path, animations: 'disabled', style: 'header, .mobile-course-bar, button.sticky { visibility: hidden !important; }' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

async function inspectLayout(figure: Locator) {
  return figure.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const overflow = [...element.querySelectorAll('*')].filter((child) => {
      const box = child.getBoundingClientRect();
      return box.width > 0 && (box.left < bounds.left - 1 || box.right > bounds.right + 1);
    }).map((child) => ({ tag: child.tagName, text: child.textContent }));
    const tabs = [...element.querySelectorAll('[role="tab"]')].map((tab) => ({
      cursor: getComputedStyle(tab).cursor, height: tab.getBoundingClientRect().height,
    }));
    const cycle = element.querySelector('[data-pretraining-return]');
    let arrow = null;
    if (cycle) {
      const path = cycle.querySelector<SVGPathElement>('[data-return-path]')!;
      const nodes = [...element.querySelectorAll('[data-pretraining-operation]')].map((node) => node.getBoundingClientRect());
      const svg = cycle.getBoundingClientRect();
      const vertical = Math.abs(nodes[0].top - nodes[2].top) > 1;
      const point = path.getPointAtLength(path.getTotalLength());
      const targetX = vertical ? nodes[0].left - svg.left : nodes[0].left + nodes[0].width / 2 - svg.left;
      const targetY = vertical ? nodes[0].top + nodes[0].height / 2 - svg.top : nodes[0].bottom - svg.top;
      arrow = { vertical, distance: Math.hypot(point.x - targetX, point.y - targetY), length: path.getTotalLength() };
    }
    return { overflow, tabs, arrow };
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
      await expect(figure.getByRole('list', { name: '数据来源' }).getByRole('listitem')).toHaveCount(3);
      await expect(figure.getByRole('list', { name: '数据来源' }).locator('svg')).toHaveCount(3);
      await expect(figure.locator('[data-pretraining-text]')).toHaveText('训练文本');
      await expect(figure).not.toContainText('今天下雨');
      await capture(figure, `pretraining-cleaning-${scenario.name}`);
      const evidence = [await inspectLayout(figure)];

      await tabs.first().focus();
      await tabs.first().press('ArrowRight');
      await expect(tabs.nth(1)).toBeFocused();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
      await expect(figure.getByText('Tokenizer（Token → Token ID）', { exact: true })).toBeVisible();
      await expect(figure.locator('dt')).toHaveText(['Token：今天', 'Token：广州', 'Token：的', 'Token：天气', 'Token：如何', 'Token：？']);
      expect(await figure.locator('[data-token-id]').evaluateAll((tokens) => tokens.map((token) => token.getAttribute('data-token-id')))).toEqual(['47256', '132426', '1616', '167823', '24608', '4802']);
      await expect(figure).not.toContainText('这里的切分仅作示意');
      await capture(figure, `pretraining-tokens-${scenario.name}`);
      evidence.push(await inspectLayout(figure));

      await tabs.nth(2).click();
      await expect(figure.locator('[data-pretraining-operation]')).toHaveText(['预测下一个 Token', '对照原文', '调整参数']);
      await expect(figure.locator('[data-return-path]')).toHaveAttribute('d', /^M/);
      await expect(figure).not.toContainText('计算误差');
      await capture(figure, `pretraining-cycle-${scenario.name}`);
      evidence.push(await inspectLayout(figure));
      expect(evidence[2].arrow!.vertical).toBe(scenario.name !== 'desktop');
      expect(evidence[2].arrow!.distance).toBeLessThanOrEqual(5);
      if (scenario.name === 'desktop') {
        await page.setViewportSize({ width: 390, height: 844 });
        await expect.poll(async () => (await inspectLayout(figure)).arrow?.vertical).toBe(true);
        await expect.poll(async () => (await inspectLayout(figure)).arrow!.distance).toBeLessThanOrEqual(5);
        await capture(figure, 'pretraining-cycle-after-resize');
      }
      for (const measurement of evidence) {
        expect(measurement.overflow).toEqual([]);
        expect(measurement.tabs.every((tab) => tab.cursor === 'pointer' && tab.height >= 44)).toBe(true);
      }
      const accessibility = await new AxeBuilder({ page }).include('[data-pretraining-overview]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await tabs.nth(2).focus();
      await tabs.nth(2).press('Home');
      await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
      await tabs.first().press('End');
      await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
      await expect(figure.locator('[data-return-path]')).toHaveAttribute('d', /^M/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      await test.info().attach('pretraining-layout', { body: JSON.stringify({ evidence, errors }, null, 2), contentType: 'application/json' });
    });
  }

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
      await expect(figure.locator('noscript [data-token-id]')).toHaveCount(6);
      await expect(figure.getByText('预测下一个 Token → 对照原文 → 调整参数 → 再次预测', { exact: true })).toBeVisible();
      expect((await inspectLayout(figure)).overflow).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await capture(figure, 'pretraining-no-javascript');
    } finally { await context.close(); }
  });
});
