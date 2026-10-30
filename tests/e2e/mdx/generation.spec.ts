import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('LLM generation rules', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'The lesson belongs to the published catalog.');

  for (const viewport of [{ name: 'desktop', width: 1280, height: 960 }, { name: 'mobile', width: 390, height: 844 }, { name: 'narrow', width: 320, height: 844 }]) {
    test(`generation works on ${viewport.name}`, async ({ page }) => {
      test.setTimeout(60000);
      await page.setViewportSize(viewport);
      await page.clock.install({ time: new Date('2026-10-27T10:00:00Z') });
      await page.clock.pauseAt(new Date('2026-10-27T10:00:01Z'));
      const response = await page.goto('/zh/courses/llm-101/what-a-language-model-does');
      expect(response?.status()).toBe(200);
      const generation = page.getByRole('figure', { name: '文字接龙演示' });
      await expect(generation).toHaveAttribute('data-ready', 'true');
      await generation.scrollIntoViewIfNeeded();
      await page.clock.runFor(100);
      const replay = generation.getByRole('button', { name: '重新播放', exact: true });
      await replay.click();
      await expect(generation.locator('figcaption')).toHaveText('预测概率 → 按规则选择 → 继续生成');
      await page.clock.runFor(400);
      await expect(generation.locator('[data-step]')).toHaveCount(0);
      await expect(generation.locator('[data-probability-label]')).toHaveText(['—', '—', '—']);
      await page.clock.runFor(400);
      await expect(generation).toHaveAttribute('data-phase', 'probabilities');
      await expect(generation.locator('[data-probability-label]')).toHaveText(['48%', '42%', '10%']);
      await expect(generation.locator('[data-selected="true"]')).toHaveCount(0);
      await page.clock.runFor(900);
      await generation.getByRole('button', { name: '暂停', exact: true }).click();
      const selected = generation.locator('[data-selected="true"]');
      await expect(generation).toHaveAttribute('data-phase', 'selected');
      await expect(selected.locator('[data-letter]')).toHaveText('今');
      await expect(selected).toHaveAttribute('data-probability', '42');
      await expect(generation.locator('[data-candidate="0"]')).toHaveAttribute('data-probability', '48');
      await expect(generation.locator('[data-candidate="0"]')).toHaveAttribute('data-selected', 'false');
      await test.info().attach(`generation-sampling-${viewport.name}`, {
        body: JSON.stringify(await generation.locator('[data-candidate]').evaluateAll((elements) => elements.map((element) => ({ text: element.textContent, ...((element as HTMLElement).dataset) }))), null, 2), contentType: 'application/json',
      });
      await expect(generation.locator('[data-current-input]')).toHaveText('今天广州的天气如何？');
      const padding = await generation.locator('[data-current] [data-row-content]').evaluate((panel) => {
        const bounds = panel.getBoundingClientRect();
        const input = panel.querySelector('[data-input-row]')!.getBoundingClientRect();
        const candidates = panel.querySelector('[data-candidates]')!.getBoundingClientRect();
        const style = getComputedStyle(panel);
        return { horizontal: parseFloat(style.paddingLeft), top: Math.min(input.top, candidates.top) - bounds.top, bottom: bounds.bottom - Math.max(input.bottom, candidates.bottom) };
      });
      expect(padding.top).toBeCloseTo(padding.horizontal, 1);
      expect(padding.bottom).toBeCloseTo(padding.horizontal, 1);
      await test.info().attach(`generation-padding-${viewport.name}`, { body: JSON.stringify(padding, null, 2), contentType: 'application/json' });
      await page.clock.runFor(1000);
      await expect(generation).toHaveAttribute('data-phase', 'selected');
      await test.info().attach(`generation-selected-${viewport.name}`, { body: await generation.screenshot(), contentType: 'image/png' });
      await generation.getByRole('button', { name: '继续播放', exact: true }).click();
      await page.clock.runFor(800);
      await expect(generation.locator('[data-draft-input]')).toHaveText('今天广州的天气如何？今');
      await page.clock.runFor(900);
      await expect(generation).toHaveAttribute('data-round', '2');
      await expect(generation.locator('[data-current-input]')).toHaveText('今天广州的天气如何？今');
      await page.clock.runFor(1500);
      await expect(selected.locator('[data-letter]')).toHaveText('天');
      await expect(selected).toHaveAttribute('data-probability', '81');
      await page.clock.runFor(800);
      await expect(generation.locator('[data-draft-input]')).toHaveText('今天广州的天气如何？今天');
      await page.clock.runFor(40000);
      await expect(generation).toHaveAttribute('data-complete', 'true');
      await expect(generation.locator('[data-generation-output]')).toHaveText('今天广州天气晴朗，温度在 28 ℃。');
      expect(await generation.locator('[data-draft-input]').innerText()).toBe('今天广州天气晴朗，温度在 28 ℃。');
      await expect(generation.getByRole('button', { name: '暂停', exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const path = test.info().outputPath(`generation-complete-${viewport.name}.png`);
      await generation.screenshot({ path });
      await test.info().attach(`generation-complete-${viewport.name}`, { path, contentType: 'image/png' });
      await replay.click();
      await expect(generation.locator('[data-generation-output]')).toBeEmpty();
      await expect(generation).toHaveAttribute('data-round', '1');
      await generation.getByRole('button', { name: '暂停', exact: true }).click();
      await replay.click();
      await expect(generation).toHaveAttribute('data-playing', 'true');
      await page.clock.runFor(1700);
      await expect(selected.locator('[data-letter]')).toHaveText('今');
      await expect(selected).toHaveAttribute('data-probability', '42');
    });

  }

  test('generation respects reduced motion and enlarged text', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/zh/courses/llm-101/what-a-language-model-does');
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
    const generation = page.getByRole('figure', { name: '文字接龙演示' });
    await expect(generation).toHaveAttribute('data-complete', 'true');
    await generation.scrollIntoViewIfNeeded();
    await expect(generation).toHaveAttribute('data-playing', 'false');
    await expect(generation.locator('[data-generation-output]')).toHaveText('今天广州天气晴朗，温度在 28 ℃。');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Faded animation snapshots have a text alternative; audit the controls and accessible description.
    const accessibility = await new AxeBuilder({ page }).include('[data-generation-demo]').exclude('[data-paper]').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    const path = test.info().outputPath('generation-reduced-enlarged.png');
    await generation.screenshot({ path });
    await test.info().attach('generation-reduced-enlarged', { path, contentType: 'image/png' });
  });

});
