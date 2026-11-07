import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const lesson = '/zh/courses/llm-101/how-language-models-are-trained';

async function capture(figure: Locator, name: string) {
  await figure.scrollIntoViewIfNeeded();
  const path = test.info().outputPath(`${name}.png`);
  await figure.screenshot({ path, animations: 'disabled', style: 'header, .mobile-course-bar, button.sticky { visibility: hidden !important; }' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

async function layout(figure: Locator) {
  return figure.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const overflow = [...element.querySelectorAll('*')].filter((child) => {
      const rect = child.getBoundingClientRect();
      return rect.width > 0 && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1);
    }).map((child) => ({ tag: child.tagName, text: child.textContent }));
    const buttons = [...element.querySelectorAll('button')].map((button) => ({
      label: button.textContent, height: button.getBoundingClientRect().height,
    }));
    const softmaxAlignment = [...element.querySelectorAll<HTMLElement>('[data-training-model]')].flatMap((model) => {
      const row = model.querySelector<HTMLElement>('[data-training-softmax]');
      if (!row) return [];
      const arrow = row.querySelector('svg')!;
      const style = getComputedStyle(model);
      const contentLeft = model.getBoundingClientRect().left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
      return [{ model: model.dataset.trainingModel, offset: arrow.getBoundingClientRect().left - contentLeft }];
    });
    return { width: bounds.width, overflow, buttons, softmaxAlignment };
  });
}

async function formulaSnapshot(model: Locator) {
  return model.evaluate((element) => {
    const probabilities = [...element.querySelectorAll('[data-training-probability]')].map((value) => Number(value.textContent?.replace('%', '')));
    return [...element.querySelectorAll('[data-training-formula-candidate]')].map((row, index) => ({
      token: row.getAttribute('data-training-formula-candidate'),
      a: Number(row.querySelector('[data-training-coefficient="a"] [data-coefficient-value]')!.textContent),
      b: Number(row.querySelector('[data-training-coefficient="b"] [data-coefficient-value]')!.textContent),
      score: Number(row.querySelector('[data-training-score]')!.textContent),
      probability: probabilities[index],
    }));
  });
}

async function historySnapshot(figure: Locator, round: number) {
  const readSegments = () => figure.locator('[data-training-history] > li').evaluateAll((elements) => elements.map((element) => ({
    black: getComputedStyle(element).borderTopColor === getComputedStyle(element).color,
    current: element.getAttribute('aria-current') === 'step',
    dotColor: getComputedStyle(element, '::before').backgroundColor,
    foreground: getComputedStyle(element).color,
  })));
  await expect.poll(async () => {
    const segments = await readSegments();
    return {
      black: segments.map((segment) => segment.black),
      current: segments.map((segment) => segment.current),
      dotBlack: segments[round].dotColor === segments[round].foreground,
    };
  }).toEqual({
    black: [0, 1, 2, 3].map((index) => index < round),
    current: [0, 1, 2, 3].map((index) => index === round),
    dotBlack: true,
  });
  return readSegments();
}

test.describe('Prediction training demos', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'The training lesson belongs to the published catalog.');

  for (const scenario of [
    { name: 'desktop', width: 1280, height: 960 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'narrow', width: 320, height: 844 },
    { name: 'enlarged-reduced', width: 320, height: 960 },
  ]) {
    test(`independent training demos work on ${scenario.name}`, async ({ page }) => {
      test.setTimeout(60000);
      await page.setViewportSize(scenario);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      if (scenario.name === 'enlarged-reduced') await page.emulateMedia({ reducedMotion: 'reduce' });
      expect((await page.goto(lesson))?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      if (scenario.name === 'enlarged-reduced') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
      const single = page.getByRole('figure', { name: '一轮预测训练', exact: true });
      const multiple = page.getByRole('figure', { name: '多轮预测训练', exact: true });
      await expect(single).toHaveCount(1);
      await expect(multiple).toHaveCount(1);
      const history = [await historySnapshot(multiple, 0)];
      await capture(multiple, `multiple-initial-${scenario.name}`);
      for (const figure of [single, multiple]) {
        await expect(figure).toHaveAttribute('lang', 'zh-CN');
        await expect(figure.locator('figcaption')).toHaveCount(0);
        await expect(figure).not.toContainText('训练原文');
        await expect(figure).not.toContainText('均为示意');
        await expect(figure).not.toContainText('一周');
        await expect(figure).not.toContainText('七');
      }
      await expect(single.getByRole('list', { name: '本轮训练步骤' }).getByRole('listitem')).toHaveText(['00初始化', '01预测', '02对照', '03调参数']);
      await expect(multiple.locator('[data-training-input]')).toHaveText('今天雨天，出门记得带…');
      await expect(multiple.locator('[data-training-candidates]')).toHaveAttribute('aria-label', '伞 25%，雨衣 40%，帽子 35%');
      await expect(multiple.getByRole('list', { name: '每轮训练后的伞的预测概率' })).toHaveCount(1);
      expect(await page.locator('article [data-training-demo]').evaluateAll((elements) => elements.map((element) => element.getAttribute('data-training-demo')))).toEqual(['single', 'multiple']);
      await expect(page.locator('[data-achievement="generation-vs-verification"]')).toHaveCount(1);
      await expect(single.locator('[data-training-target]')).toHaveCount(0);
      const beforeModel = single.locator('[data-training-model="before"]');
      const afterModel = single.locator('[data-training-model="after"]');
      await expect(beforeModel).toHaveCount(1);
      await expect(afterModel).toHaveCount(0);
      const beforeNode = await beforeModel.elementHandle();
      await expect(single).toHaveAttribute('data-step', '0');
      await expect(single.locator('[data-training-input-row]')).toHaveCount(0);
      await expect(single.locator('[data-training-score]')).toHaveCount(0);
      await expect(single.locator('[data-training-probability]')).toHaveCount(0);
      await expect(single.locator('[data-training-softmax]')).toHaveCount(0);
      await expect(single.getByRole('note', { name: '这次预测与原文的差距' })).toHaveCount(0);
      expect(await beforeModel.locator('[data-training-formula-candidate]').evaluateAll((elements) => elements.map((element) => element.getAttribute('data-training-formula-candidate')))).toEqual(['伞', '雨衣', '帽子']);
      const initialParameters = await beforeModel.locator('[data-coefficient-value]').allTextContents();
      await expect(beforeModel.locator('[data-training-formula-candidate="伞"] [data-coefficient-value]')).toHaveText(['0.50', '1.10']);
      await capture(single, `single-initialize-${scenario.name}`);
      const initializationLayout = await layout(single);
      expect(initializationLayout.overflow).toEqual([]);
      const statusSizes = [await single.getByRole('status').boundingBox()];
      const start = single.getByRole('button', { name: '开始预测', exact: true });
      await start.focus();
      await start.press('Enter');
      await expect(single).toHaveAttribute('data-step', '1');
      await expect(single.locator('[data-training-input]')).toHaveText('今天雨天，出门记得带…');
      await expect(single.locator('[data-training-target]')).toHaveCount(0);
      await expect(single.locator('[data-training-probability]')).toHaveText(['25%', '40%', '35%']);
      await expect(single.getByRole('note', { name: '这次预测与原文的差距' })).toHaveCount(0);
      expect(await beforeModel.locator('[data-coefficient-value]').allTextContents()).toEqual(initialParameters);
      await single.getByRole('button', { name: '上一步', exact: true }).click();
      await expect(single).toHaveAttribute('data-step', '0');
      await expect(single.locator('[data-training-input-row]')).toHaveCount(0);
      await expect(single.locator('[data-training-score]')).toHaveCount(0);
      expect(await beforeModel.locator('[data-coefficient-value]').allTextContents()).toEqual(initialParameters);
      await single.getByRole('button', { name: '开始预测', exact: true }).click();
      await expect(single).toHaveAttribute('data-step', '1');
      const originalSnapshot = await formulaSnapshot(beforeModel);
      await expect(single.getByText('原文的下一个 Token', { exact: true })).toHaveCount(0);
      await capture(single, `single-predict-${scenario.name}`);
      const predictionLayout = await layout(single);
      expect(predictionLayout.overflow).toEqual([]);
      statusSizes.push(await single.getByRole('status').boundingBox());

      const next = single.getByRole('button', { name: '对照原文', exact: true });
      await next.focus();
      await next.press('Enter');
      await expect(single).toHaveAttribute('data-step', '2');
      await expect(single.locator('[data-training-target]')).toHaveText('伞');
      await expect(single.locator('[data-training-target]')).toBeVisible();
      statusSizes.push(await single.getByRole('status').boundingBox());
      await expect(single.locator('[data-comparing="true"]')).toHaveText('伞25%');
      const comparisonNote = single.getByRole('note', { name: '这次预测与原文的差距' });
      await expect(comparisonNote).toBeVisible();
      await expect(comparisonNote).toContainText('答案是「伞」');
      await expect(comparisonNote).toContainText('却只给了 25%');
      await expect(comparisonNote).toContainText('要提高它的概率');
      await page.evaluate(() => document.fonts.ready);
      const annotationLayout = await comparisonNote.evaluate((element) => {
        const copy = element.querySelector('p')!;
        const text = copy.getBoundingClientRect();
        const model = element.closest('[data-training-model]')!;
        const target = model.querySelector('[data-comparing="true"]')!.getBoundingClientRect();
        const fontFamily = getComputedStyle(copy).fontFamily;
        const collisions = [...model.querySelectorAll('[data-training-coefficient], [data-training-score]')].filter((value) => {
          const rect = value.getBoundingClientRect();
          return text.left < rect.right && text.right > rect.left && text.top < rect.bottom && text.bottom > rect.top;
        }).map((value) => value.textContent);
        return { collisions, fontFamily, customFont: fontFamily !== getComputedStyle(model).fontFamily, fontLoaded: document.fonts.check(`18px ${fontFamily.split(',')[0]}`, '答案是「伞」'), copyAboveTarget: text.bottom < target.top };
      });
      expect(annotationLayout.collisions).toEqual([]);
      expect(annotationLayout.customFont && annotationLayout.fontLoaded && annotationLayout.copyAboveTarget).toBe(true);
      await expect(single.locator('[data-training-probability]')).toHaveText(['25%', '40%', '35%']);
      await expect(afterModel).toHaveCount(0);
      expect(await formulaSnapshot(beforeModel)).toEqual(originalSnapshot);
      await capture(single, `single-compare-${scenario.name}`);
      const comparisonAlignment = await single.locator('[data-training-input-row]').evaluate((element) => {
        const input = element.querySelector('[data-training-input]')!.getBoundingClientRect();
        const target = element.querySelector('[data-training-target]')!.getBoundingClientRect();
        return { input: { left: input.left, right: input.right, bottom: input.bottom }, target: { left: target.left, bottom: target.bottom } };
      });
      if (scenario.name !== 'enlarged-reduced') {
        expect(Math.abs(comparisonAlignment.input.bottom - comparisonAlignment.target.bottom)).toBeLessThan(1);
        expect(comparisonAlignment.input.right).toBeLessThan(comparisonAlignment.target.left);
      }
      const comparisonLayout = await layout(single);
      expect(comparisonLayout.overflow).toEqual([]);
      await single.getByRole('button', { name: '根据差距调参数', exact: true }).click();
      await expect(single).toHaveAttribute('data-step', '3');
      await expect(single.getByRole('note', { name: '这次预测与原文的差距' })).toHaveCount(0);
      statusSizes.push(await single.getByRole('status').boundingBox());
      await expect(beforeModel).toBeVisible();
      await expect(afterModel).toBeVisible();
      await expect(beforeModel.locator('[data-training-probability]')).toHaveText(['25%', '40%', '35%']);
      await expect(afterModel.locator('[data-training-probability]')).toHaveText(['45%', '30%', '25%']);
      await expect(afterModel.locator('[data-training-formula-candidate="伞"] [data-coefficient-value]')).toHaveText(['0.60', '1.20']);
      expect(await beforeNode!.evaluate((element) => element.isConnected)).toBe(true);
      expect(await formulaSnapshot(beforeModel)).toEqual(originalSnapshot);
      const updatedSnapshot = await formulaSnapshot(afterModel);
      expect(updatedSnapshot.every((candidate, index) => candidate.a !== originalSnapshot[index].a && candidate.b !== originalSnapshot[index].b)).toBe(true);
      for (const snapshot of [originalSnapshot, updatedSnapshot]) {
        const total = snapshot.reduce((sum, candidate) => sum + Math.exp(candidate.score), 0);
        for (const candidate of snapshot) {
          expect(candidate.a * 1 + candidate.b).toBeCloseTo(candidate.score, 10);
          expect(Math.round(Math.exp(candidate.score) / total * 100)).toBe(candidate.probability);
        }
        expect(snapshot.reduce((sum, candidate) => sum + candidate.probability, 0)).toBe(100);
      }
      const articleTables = page.locator('article table');
      await expect(articleTables).toHaveCount(2);
      const articleCalculations = [];
      for (const [index, snapshot] of [originalSnapshot, updatedSnapshot].entries()) {
        const rows = await articleTables.nth(index).locator('tbody tr').evaluateAll((elements) => elements.map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent?.trim())));
        const total = snapshot.reduce((sum, candidate) => sum + Math.exp(candidate.score), 0);
        expect(rows).toEqual(snapshot.map((candidate) => [candidate.token, `${candidate.a.toFixed(2)} × 1 + ${candidate.b.toFixed(2)}`, candidate.score.toFixed(2), `约 ${(Math.exp(candidate.score) / total * 100).toFixed(2)}%`]));
        articleCalculations.push(rows);
      }
      await test.info().attach('article-softmax-calculations', { body: JSON.stringify(articleCalculations, null, 2), contentType: 'application/json' });
      const modelPositions = await single.locator('[data-training-model]').evaluateAll((elements) => elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      }));
      if (scenario.name === 'desktop') expect(modelPositions[1].left).toBeGreaterThan(modelPositions[0].right);
      else expect(modelPositions[1].top).toBeGreaterThan(modelPositions[0].bottom);
      await expect(single.getByRole('button', { name: '本轮完成', exact: true })).toBeDisabled();
      const activeStep = single.locator('[aria-current="step"]');
      await activeStep.scrollIntoViewIfNeeded();
      await expect(activeStep).toHaveCSS('color', 'rgb(9, 9, 11)');
      const activeStyle = await activeStep.evaluate((element) => ({ color: getComputedStyle(element).color, border: getComputedStyle(element).borderBottomColor }));
      const inactiveStyle = await single.locator('ol li').first().evaluate((element) => ({ color: getComputedStyle(element).color, border: getComputedStyle(element).borderBottomColor }));
      expect(activeStyle).not.toEqual(inactiveStyle);
      await capture(single, `single-complete-${scenario.name}`);
      await single.getByRole('button', { name: '上一步', exact: true }).click();
      await expect(afterModel).toHaveCount(0);
      await expect(single.locator('[data-training-probability]')).toHaveText(['25%', '40%', '35%']);
      await expect(single.locator('[data-training-target]')).toHaveText('伞');
      await single.getByRole('button', { name: '根据差距调参数', exact: true }).click();

      for (const [index, label] of ['训练一轮', '再训练一轮', '再训练一轮'].entries()) {
        await multiple.getByRole('button', { name: label, exact: true }).click();
        await expect(multiple).toHaveAttribute('data-round', String(index + 1));
        history.push(await historySnapshot(multiple, index + 1));
        await expect(multiple.locator('[data-training-candidates] [data-answer="true"]')).toContainText([45, 60, 72][index] + '%');
        await expect(single).toHaveAttribute('data-step', '3');
      }
      await expect(multiple.locator('[data-training-history] li > span:last-child')).toHaveText(['25%', '45%', '60%', '72%']);
      await expect(multiple.getByRole('button', { name: '演示完成', exact: true })).toBeDisabled();
      await capture(multiple, `multiple-complete-${scenario.name}`);

      const evidence = { single: await layout(single), initializationLayout, predictionLayout, comparisonLayout, comparisonAlignment, annotationLayout, multiple: await layout(multiple), statusSizes, initialParameters, originalSnapshot, updatedSnapshot, modelPositions, activeStyle, inactiveStyle };
      expect(statusSizes.every((size) => size && size.width <= 1 && size.height <= 1)).toBe(true);
      for (const metric of [evidence.single, evidence.multiple]) {
        expect(metric.overflow).toEqual([]);
        expect(metric.buttons.every((button) => button.height >= 44)).toBe(true);
        expect(metric.softmaxAlignment.every((row) => Math.abs(row.offset) < 1)).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const accessibility = await new AxeBuilder({ page }).include('[data-training-demo]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await single.getByRole('button', { name: '重新演示', exact: true }).click();
      await expect(single).toHaveAttribute('data-step', '0');
      await expect(single.locator('[data-training-target]')).toHaveCount(0);
      await expect(single.locator('[data-training-input-row]')).toHaveCount(0);
      await expect(single.locator('[data-training-probability]')).toHaveCount(0);
      await expect(multiple).toHaveAttribute('data-round', '3');
      await multiple.getByRole('button', { name: '重新演示', exact: true }).click();
      await expect(multiple).toHaveAttribute('data-round', '0');
      history.push(await historySnapshot(multiple, 0));
      await expect(multiple.locator('[data-training-history] li > span:last-child')).toHaveText(['25%', '—', '—', '—']);
      expect(errors).toEqual([]);
      await test.info().attach('training-layout-and-errors', { body: JSON.stringify({ ...evidence, history, errors }, null, 2), contentType: 'application/json' });
    });
  }

  test('training remains readable without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
    try {
      const page = await context.newPage();
      expect((await page.goto(lesson))?.status()).toBe(200);
      const single = page.getByRole('figure', { name: '一轮预测训练', exact: true });
      const multiple = page.getByRole('figure', { name: '多轮预测训练', exact: true });
      await expect(single.getByRole('list', { name: '一轮预测训练的完整过程' })).toBeVisible();
      await expect(single.getByRole('list', { name: '一轮预测训练的完整过程' })).toHaveAttribute('start', '0');
      await expect(single.getByRole('listitem')).toHaveCount(4);
      await expect(single.getByRole('listitem').first()).toContainText('初始化');
      await expect(single.getByRole('listitem')).toContainText(['0.50', '今天雨天，出门记得带', '伞', 'a 从 0.50 变为 0.60']);
      await expect(single.getByRole('listitem').last()).toContainText('分数从 1.60 变为 1.80');
      await expect(single.getByRole('listitem').last()).toContainText('概率从 25% 变为 45%');
      await expect(multiple.locator('noscript [data-training-history]')).toBeVisible();
      await expect(multiple.locator('noscript [data-training-input]')).toHaveText('今天雨天，出门记得带…');
      await expect(multiple.locator('noscript [data-training-candidates]')).toHaveAttribute('aria-label', '伞 72%，雨衣 16%，帽子 12%');
      await expect(multiple.locator('noscript [data-training-history] li > span:last-child')).toHaveText(['25%', '45%', '60%', '72%']);
      await expect(single.getByRole('button')).toHaveCount(0);
      await expect(multiple.getByRole('button')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await capture(single, 'single-no-js');
      await capture(multiple, 'multiple-no-js');
      await test.info().attach('training-no-js', { body: JSON.stringify({ single: await single.innerText(), multiple: await multiple.innerText() }, null, 2), contentType: 'application/json' });
    } finally { await context.close(); }
  });

  test('training authoring accepts standalone demos and rejects unsupported content', async ({ browserName }) => {
    test.skip(browserName !== 'chromium', 'The authoring CLI is independent of the browser.');
    test.setTimeout(60000);
    const root = mkdtempSync(join(tmpdir(), 'aidevcourse-training-'));
    try {
      cpSync('tests/fixtures', join(root, 'tests/fixtures'), { recursive: true });
      cpSync('public', join(root, 'public'), { recursive: true });
      const file = join(root, 'tests/fixtures/en/ai-coding/foundations/first-change.mdx');
      const original = readFileSync(file, 'utf8');
      const evidence = [];
      for (const component of ['LLMPretrainingOverview', 'LLMSingleRoundTrainingDemo', 'LLMMultiRoundTrainingDemo']) {
        for (const example of [
          { body: `\n<${component} />\n`, valid: true, error: '' },
          { body: `\n<${component} title="Example" />\n`, valid: false, error: 'does not accept attributes' },
          { body: `\nText <${component} /> inline.\n`, valid: false, error: 'must be a standalone block' },
          { body: `\n<${component}>\nHidden text\n</${component}>\n`, valid: false, error: 'does not accept children' },
        ]) {
          writeFileSync(file, original + example.body);
          const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/content/check.ts')], {
            cwd: root, env: { ...process.env, CONTENT_TEST: '1' }, encoding: 'utf8', timeout: 15000,
          });
          const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
          expect(result.error).toBeUndefined();
          expect(result.status === 0, output).toBe(example.valid);
          if (example.error) expect(output).toContain(example.error);
          evidence.push({ component, input: example.body, status: result.status, output });
        }
      }
      await test.info().attach('training-authoring', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
