import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const lesson = '/zh/courses/llm-101/how-models-calculate-token-probabilities';

test.describe('Token probability flow diagram', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'The diagram belongs to the published probability lesson.');

  for (const scenario of [
    { name: 'desktop', width: 1280, height: 960, javaScriptEnabled: true },
    { name: 'mobile', width: 390, height: 844, javaScriptEnabled: true },
    { name: 'narrow', width: 320, height: 844, javaScriptEnabled: true },
    { name: 'enlarged', width: 320, height: 960, javaScriptEnabled: true },
    { name: 'no-js', width: 320, height: 960, javaScriptEnabled: false },
  ]) {
    test(`flow remains aligned and readable on ${scenario.name}`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ baseURL, viewport: scenario, javaScriptEnabled: scenario.javaScriptEnabled });
      try {
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        expect((await page.goto(lesson))?.status()).toBe(200);
        if (scenario.javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
        if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
        const diagram = page.getByRole('figure', { name: '从输入内容到采样选择下一个 Token 的过程', exact: true });
        await expect(diagram).toHaveCount(1);
        await expect(page.locator('article h2').filter({ hasText: '从简单类比到真实模型' })).toHaveCount(1);
        expect(await diagram.evaluate((element) => element.previousElementSibling?.textContent)).toContain('实际 LLM');
        await expect(page.locator('article pre code').filter({ hasText: '输入 token ID' })).toHaveCount(0);
        expect(await diagram.locator('[data-probability-stage]').evaluateAll((elements) => elements.map((element) => element.getAttribute('data-probability-stage'))))
          .toEqual(['input', 'compute', 'scores', 'sampling']);
        await expect(diagram.locator('[data-probability-stage="input"]')).toContainText('今天下雨，出门记得带…');
        await expect(diagram.locator('[data-probability-stage="compute"]')).toContainText('大量相互连接的计算');
        await expect(diagram.locator('[data-probability-stage="compute"] svg[viewBox="0 0 400 120"] path')).toHaveCount(40);
        await expect(diagram.locator('[data-probability-stage="compute"] svg[viewBox="0 0 400 120"] circle')).toHaveCount(13);
        await expect(diagram.locator('[data-probability-stage="scores"]')).toContainText('得到很多分数');
        await expect(diagram.getByText('Softmax', { exact: false })).toHaveCount(0);
        await expect(diagram.locator('[data-probability-stage="sampling"]')).toContainText('按采样策略选择一个 Token ID');
        await expect(diagram.locator('[data-probability-output]')).toHaveText('伞');
        await expect(diagram.getByRole('button')).toHaveCount(0);
        await expect(diagram.locator('figcaption')).toHaveCount(0);

        const evidence = await diagram.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const scores = [...element.querySelectorAll<HTMLElement>('[data-score-candidate]')];
          const tokens = [...element.querySelectorAll<HTMLElement>('[data-token-candidate]')];
          const candidateColumns = scores.map((score, index) => ({
            scoreId: score.dataset.scoreCandidate,
            tokenId: tokens[index].dataset.tokenCandidate,
            scoreCenter: score.getBoundingClientRect().left + score.getBoundingClientRect().width / 2,
            tokenCenter: tokens[index].getBoundingClientRect().left + tokens[index].getBoundingClientRect().width / 2,
            scoreBottom: score.getBoundingClientRect().bottom,
            tokenTop: tokens[index].getBoundingClientRect().top,
            scoreText: score.textContent,
            tokenText: tokens[index].textContent,
          }));
          const overflow = [...element.querySelectorAll('*')].filter((child) => {
            const rect = child.getBoundingClientRect();
            return rect.width > 0 && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1);
          }).map((child) => ({ tag: child.tagName, text: child.textContent }));
          const style = getComputedStyle(element);
          const input = element.querySelector<HTMLElement>('[data-probability-input]')!;
          const sampling = element.querySelector<HTMLElement>('[data-probability-sampling]')!;
          return { candidateColumns, overflow, surfaces: { input: getComputedStyle(input).backgroundColor, sampling: getComputedStyle(sampling).backgroundColor, foreground: style.color }, frame: { border: style.border, radius: style.borderRadius, shadow: style.boxShadow } };
        });
        expect(evidence.candidateColumns.map((column) => column.scoreId)).toEqual(['伞', '雨衣', '帽子']);
        for (const [index, column] of evidence.candidateColumns.entries()) {
          expect(column.scoreId).toBe(column.tokenId);
          expect(Math.abs(column.scoreCenter - column.tokenCenter)).toBeLessThan(1);
          expect(column.scoreBottom).toBeLessThan(column.tokenTop);
          expect(column.scoreText).toContain(`分数 ${index + 1}`);
          expect(column.tokenText).toBe(column.scoreId);
        }
        expect(evidence.surfaces.input).toBe(evidence.surfaces.sampling);
        expect(evidence.surfaces.sampling).not.toBe(evidence.surfaces.foreground);
        expect(evidence.overflow).toEqual([]);
        expect(evidence.frame.border).toBe('1px solid rgb(9, 9, 11)');
        expect(evidence.frame.radius).toBe(scenario.name === 'enlarged' ? '6px' : '4px');
        expect(evidence.frame.shadow).toContain('rgb(228, 228, 231) 4px 4px 0px 0px');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (scenario.javaScriptEnabled) {
          const accessibility = await new AxeBuilder({ page }).include('[data-token-probability-diagram]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
          expect(accessibility.violations).toEqual([]);
        }
        await diagram.scrollIntoViewIfNeeded();
        const screenshot = test.info().outputPath(`probability-flow-${scenario.name}.png`);
        await diagram.screenshot({ path: screenshot, animations: 'disabled', style: 'header, .mobile-course-bar, button.sticky { visibility: hidden !important; }' });
        await test.info().attach('Probability flow diagram', { path: screenshot, contentType: 'image/png' });
        expect(errors).toEqual([]);
        await test.info().attach('Probability flow alignment', { body: JSON.stringify({ ...evidence, errors }, null, 2), contentType: 'application/json' });
      } finally { await context.close(); }
    });
  }

  test('probability diagram authoring accepts only standalone parameterless content', async ({ browserName }) => {
    test.skip(browserName !== 'chromium', 'The authoring CLI is independent of the browser.');
    test.setTimeout(60000);
    const root = mkdtempSync(join(tmpdir(), 'aidevcourse-probability-flow-'));
    try {
      cpSync('tests/fixtures', join(root, 'tests/fixtures'), { recursive: true });
      cpSync('public', join(root, 'public'), { recursive: true });
      const file = join(root, 'tests/fixtures/en/ai-coding/foundations/first-change.mdx');
      const original = readFileSync(file, 'utf8');
      const evidence = [];
      for (const example of [
        { body: '\n<TokenProbabilityDiagram />\n', valid: true, error: '' },
        { body: '\n<TokenProbabilityDiagram title="Example" />\n', valid: false, error: 'does not accept attributes' },
        { body: '\nText <TokenProbabilityDiagram /> inline.\n', valid: false, error: 'must be a standalone block' },
        { body: '\n<TokenProbabilityDiagram>\nHidden content\n</TokenProbabilityDiagram>\n', valid: false, error: 'does not accept children' },
      ]) {
        writeFileSync(file, original + example.body);
        const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/content/check.ts')], {
          cwd: root, env: { ...process.env, CONTENT_TEST: '1' }, encoding: 'utf8', timeout: 15000,
        });
        const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
        expect(result.error).toBeUndefined();
        expect(result.status === 0, output).toBe(example.valid);
        if (example.error) expect(output).toContain(example.error);
        evidence.push({ declaration: example.body, status: result.status, output });
      }
      await test.info().attach('Probability diagram authoring', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
