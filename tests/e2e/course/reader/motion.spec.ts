import { expect, test, type Page } from '@playwright/test';

test.skip(process.env.CONTENT_TEST === '1', 'Uses published course links.');
const source = '/zh/courses/llm-101/why-model-answers-vary';
const token = '/zh/courses/llm-101/what-is-a-token';
const generation = '/zh/courses/llm-101/what-a-language-model-does';
const pane = '[data-slot="reading-pane"]';
const trigger = (page: Page) => page.locator(`[data-slot="reading-primary"] .course-prose a[href="${token}"]`).first();

type Frame = { time: number; opacity: number; closing: boolean; articles: number; contentOpacity: number | null };
type Transition = { property: string; elapsed: number; closing: boolean; slot: string | null };
type Evidence = { frames: Frame[]; transitions: Transition[] };
declare global { interface Window { readingMotionEvidence: Evidence } }

async function recordMotion(page: Page) {
  await page.addInitScript(() => {
    const evidence: Evidence = { frames: [], transitions: [] };
    window.readingMotionEvidence = evidence;
    const sample = () => {
      const stage = document.querySelector('[data-slot="lesson-reader"]');
      const pane = stage?.querySelector<HTMLElement>('[data-slot="reading-pane"], [data-slot="reading-pending"]');
      if (pane) {
        const content = pane.querySelector<HTMLElement>('[data-slot="reading-content"]');
        evidence.frames.push({ time: performance.now(), opacity: Number(getComputedStyle(pane).opacity), closing: pane.hasAttribute('data-closing'),
          articles: stage!.querySelectorAll('article').length, contentOpacity: content ? Number(getComputedStyle(content).opacity) : null });
      }
      if (evidence.frames.length > 2000) evidence.frames.shift();
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    document.addEventListener('transitionend', event => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches('[data-slot="reading-pane"], [data-slot="reading-pending"], [data-slot="reading-content"]')) return;
      evidence.transitions.push({ property: event.propertyName, elapsed: event.elapsedTime, closing: target.hasAttribute('data-closing'), slot: target.dataset.slot ?? null });
    });
  });
}

async function attachMotion(page: Page, name: string) {
  const evidence = await page.evaluate(() => window.readingMotionEvidence);
  await test.info().attach(name, { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  await test.info().attach(`${name} screen`, { body: await page.screenshot(), contentType: 'image/png' });
  return evidence;
}

for (const width of [1600, 390]) {
  test(`pointer opening and closing have complete transitions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await recordMotion(page);
    await page.goto(source);
    await trigger(page).click();
    await expect(page.locator(pane)).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => window.readingMotionEvidence.frames.some(frame => !frame.closing && frame.opacity > 0 && frame.opacity < 1))).toBe(true);
    await expect(page.locator(pane)).toHaveCSS('opacity', '1');
    await page.locator(pane).getByRole('button', { name: '关闭侧栏' }).click();
    await expect(page.locator(pane)).toHaveAttribute('data-closing', 'true');
    await expect.poll(() => page.evaluate(() => window.readingMotionEvidence.frames.some(frame => frame.closing && frame.opacity > 0 && frame.opacity < 1))).toBe(true);
    await expect(page.locator(pane)).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    const evidence = await attachMotion(page, `Reader enter and exit ${width}`);
    expect(evidence.frames.every(frame => frame.articles <= 2)).toBe(true);
    expect(evidence.transitions.some(transition => transition.closing && transition.property === 'opacity' && transition.elapsed >= 0.15 && transition.elapsed <= 0.25)).toBe(true);
  });
}

test('replacement fades in the new content without adding another article', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await recordMotion(page);
  await page.goto(source);
  await trigger(page).click();
  await expect(page.locator(pane)).toHaveCSS('opacity', '1');
  await expect(page.locator(`${pane} [data-slot="reading-content"]`)).toHaveCSS('opacity', '1');
  await page.evaluate(() => { window.readingMotionEvidence.frames.length = 0; window.readingMotionEvidence.transitions.length = 0; });
  await page.locator(pane).locator(`.course-prose a[href="${generation}"]`).first().click();
  await expect(page.locator(`${pane} article > h2`)).toHaveText('大语言模型是如何生成回答的？');
  await expect(page.locator(`${pane} [data-slot="reading-content"]`)).toHaveCSS('opacity', '1');
  const evidence = await attachMotion(page, 'Replacement content transition');
  expect(evidence.frames.some(frame => frame.contentOpacity !== null && frame.contentOpacity > 0 && frame.contentOpacity < 1)).toBe(true);
  expect(evidence.frames.every(frame => frame.articles <= 2)).toBe(true);
});

test('reduced motion opens and closes without reader animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await recordMotion(page);
  await page.goto(source);
  await trigger(page).click();
  await expect(page.locator(pane)).toBeVisible();
  expect(await page.locator(`${pane}, ${pane} [data-slot="reading-content"], [data-slot="reading-primary"] article`).evaluateAll(elements => elements.flatMap(element => element.getAnimations()).length)).toBe(0);
  await page.locator(pane).getByRole('button', { name: '关闭侧栏' }).click();
  await expect(page.locator(pane)).toHaveCount(0);
  const evidence = await attachMotion(page, 'Reduced motion reader');
  expect(evidence.transitions).toEqual([]);
});

test('keyboard navigation opens and dismisses the reader immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await recordMotion(page);
  await page.goto(source);
  await trigger(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(pane)).toBeVisible();
  await expect(page.locator(pane)).toHaveAttribute('data-motion', 'none');
  await expect(page.locator('[data-slot="link-preview"]')).toHaveCount(0);
  expect(await page.locator(pane).evaluate(element => element.getAnimations().length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator(pane)).toHaveCount(0);
  await expect(trigger(page)).toBeFocused();
  const evidence = await attachMotion(page, 'Keyboard reader motion');
  expect(evidence.transitions).toEqual([]);
});

test('reopening during exit cancels the delayed close', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await recordMotion(page);
  await page.goto(source);
  await trigger(page).click();
  await expect(page.locator(pane)).toHaveCSS('opacity', '1');
  await page.clock.install();
  await page.locator(pane).getByRole('button', { name: '关闭侧栏' }).click();
  // Activate the link while its position changes during the source transition.
  await trigger(page).dispatchEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1 });
  await page.clock.runFor(500);
  await expect(page.locator(pane)).toHaveCount(1);
  await expect(page.locator(pane)).not.toHaveAttribute('data-closing', 'true');
  expect(new URL(page.url()).searchParams.get('read')).toBe(token);
  await attachMotion(page, 'Interrupted reader exit');
});
