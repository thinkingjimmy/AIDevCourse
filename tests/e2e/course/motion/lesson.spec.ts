import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const course = '/zh/courses/coding-101';
const lesson = `${course}/animation-prompts`;
const kinds = ['stagger', 'spring', 'skeleton', 'count-up', 'typewriter', 'marquee'];

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published animation lesson.');

async function play(demo: Locator) {
  await demo.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await demo.getByRole('button', { name: /播放动效|重新播放|继续播放/ }).first().click();
  await expect(demo).toHaveAttribute('data-state', 'playing');
}

async function sampleCss(demo: Locator, time: number) {
  return demo.evaluate((element, currentTime) => {
    for (const animation of element.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = currentTime;
    }
    return [...element.querySelectorAll('[data-motion-item]')].map((item) => {
      const style = getComputedStyle(item);
      const matrix = new DOMMatrixReadOnly(style.transform);
      return { opacity: Number(style.opacity), y: matrix.m42, scale: matrix.m11 };
    });
  }, time);
}

test('discover the new lesson and copy all six complete prompts', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => { document.documentElement.dataset.copiedPrompt = text; } },
    });
  });
  await page.goto(course);
  await expect(page.locator('#course-catalog').locator('..').getByRole('listitem')).toHaveCount(28);
  await expect(page.locator(`#course-catalog`).locator('..').getByRole('link', { name: /让 AI 做出动效/ })).toHaveAttribute('href', lesson);
  await page.goto(`${course}/call-ai-with-json`);
  await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
  await expect(page).toHaveURL(lesson);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('02 让 AI 做出动效，先把名字报对');
  await expect(page.locator('[data-animation-demo]')).toHaveCount(6);
  const prompts = page.locator('div.relative.my-7').filter({ has: page.locator('pre') });
  await expect(prompts).toHaveCount(6);
  const copied = [];
  for (const prompt of await prompts.all()) {
    const expected = await prompt.locator('pre').textContent();
    await prompt.getByRole('button', { name: '复制代码', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-copied-prompt', expected!);
    expect(expected).toMatch(/reduced motion/);
    copied.push(expected);
  }
  await page.goto('/zh');
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: '搜索课时' }).fill('Stagger');
  const result = page.locator(`.search-result[href="${lesson}"]`).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(lesson);
  const accessibility = await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await testInfo.attach('animation-prompts', { body: JSON.stringify({ copied, accessibilityViolations: accessibility.violations }, null, 2), contentType: 'application/json' });
});

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 320, height: 844 }]) {
  test(`finite examples animate and replay on ${viewport.name}`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-11-04T10:00:00Z') });
    await page.clock.pauseAt(new Date('2026-11-04T10:00:01Z'));
    await page.goto(lesson);
    await page.clock.runFor(100);
    for (const kind of kinds) {
      const demo = page.locator(`[data-animation-demo="${kind}"]`);
      await expect(demo).toHaveAttribute('data-ready', 'true');
      await expect(demo).toHaveAttribute('data-state', 'idle');
      expect(await demo.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
    }

    const stagger = page.locator('[data-animation-demo="stagger"]');
    await play(stagger);
    const firstStep = await sampleCss(stagger, 40);
    expect(firstStep[0].opacity).toBeGreaterThan(0);
    expect(firstStep[0].y).toBeGreaterThan(0);
    expect(firstStep.slice(1).map((item) => item.opacity)).toEqual([0, 0]);
    await testInfo.attach(`stagger-start-${viewport.name}`, { body: await stagger.screenshot(), contentType: 'image/png' });
    const staggerEnd = await sampleCss(stagger, 500);
    expect(staggerEnd).toEqual(Array.from({ length: 3 }, () => ({ opacity: 1, y: 0, scale: 1 })));
    await page.clock.runFor(550);
    await expect(stagger).toHaveAttribute('data-state', 'complete');
    await play(stagger);
    expect((await sampleCss(stagger, 0)).map((item) => item.opacity)).toEqual([0, 0, 0]);

    const spring = page.locator('[data-animation-demo="spring"]');
    await play(spring);
    const springStart = await sampleCss(spring, 0);
    const springPeak = await sampleCss(spring, 202.5);
    const springEnd = await sampleCss(spring, 450);
    expect(springStart[0].scale).toBeCloseTo(0.96);
    expect(springPeak[0].scale).toBeCloseTo(1.05);
    expect(springEnd[0].scale).toBe(1);
    await page.clock.runFor(500);
    await expect(spring).toHaveAttribute('data-state', 'complete');
    await testInfo.attach(`spring-${viewport.name}`, { body: await spring.screenshot(), contentType: 'image/png' });

    const count = page.locator('[data-animation-demo="count-up"]');
    await play(count);
    await page.clock.runFor(300);
    const partialCount = Number((await count.locator('[data-motion-value]').textContent())!.replaceAll(',', ''));
    expect(partialCount).toBeGreaterThan(0);
    expect(partialCount).toBeLessThan(1280);
    await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded();
    await page.clock.runFor(100);
    await expect(count).toHaveAttribute('data-state', 'paused');
    const pausedCount = await count.locator('[data-motion-value]').textContent();
    await page.clock.runFor(1000);
    await expect(count.locator('[data-motion-value]')).toHaveText(pausedCount!);
    await play(count);
    await page.clock.runFor(1300);
    await expect(count).toHaveAttribute('data-state', 'complete');
    await expect(count.locator('[data-motion-value]')).toHaveText('1,280');
    await testInfo.attach(`count-up-${viewport.name}`, { body: await count.screenshot(), contentType: 'image/png' });
    await play(count);
    await page.clock.runFor(150);
    expect(Number((await count.locator('[data-motion-value]').textContent())!.replaceAll(',', ''))).toBeLessThan(1280);

    const typewriter = page.locator('[data-animation-demo="typewriter"]');
    await play(typewriter);
    const before = await typewriter.boundingBox();
    await page.clock.runFor(250);
    const partialText = await typewriter.locator('[data-motion-value]').textContent();
    expect(partialText!.length).toBeGreaterThan(0);
    expect(partialText!.length).toBeLessThan(10);
    await page.clock.runFor(900);
    await expect(typewriter).toHaveAttribute('data-state', 'complete');
    await expect(typewriter.locator('[data-motion-value]')).toHaveText('让你的想法，动起来。');
    expect((await typewriter.boundingBox())!.height).toBe(before!.height);
    await testInfo.attach(`typewriter-${viewport.name}`, { body: await typewriter.screenshot(), contentType: 'image/png' });
    await typewriter.getByRole('button', { name: '重新播放', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.clock.runFor(100);
    expect((await typewriter.locator('[data-motion-value]').textContent())!.length).toBeLessThan(10);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await testInfo.attach(`motion-samples-${viewport.name}`, { body: JSON.stringify({ firstStep, staggerEnd, springStart, springPeak, springEnd, partialCount, pausedCount, partialText, errors }, null, 2), contentType: 'application/json' });
  });
}

test('looping examples pause, resume, and stop when motion preferences change', async ({ page }, testInfo) => {
  await page.goto(lesson);
  const evidence = [];
  for (const kind of ['skeleton', 'marquee']) {
    const demo = page.locator(`[data-animation-demo="${kind}"]`);
    await play(demo);
    await expect.poll(() => demo.evaluate((element) => element.getAnimations({ subtree: true }).some((animation) => animation.playState === 'running'))).toBe(true);
    await demo.getByRole('button', { name: '暂停', exact: true }).click();
    await expect(demo).toHaveAttribute('data-state', 'paused');
    await expect.poll(() => demo.evaluate((element) => element.getAnimations({ subtree: true }).every((animation) => animation.playState === 'paused'))).toBe(true);
    const before = await demo.evaluate((element) => element.getAnimations({ subtree: true }).map((animation) => animation.currentTime));
    await demo.screenshot();
    const after = await demo.evaluate((element) => element.getAnimations({ subtree: true }).map((animation) => animation.currentTime));
    expect(after).toEqual(before);
    await testInfo.attach(`${kind}-paused`, { body: await demo.screenshot(), contentType: 'image/png' });
    await play(demo);
    await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded();
    await expect(demo).toHaveAttribute('data-state', 'paused');
    await play(demo);
    if (kind === 'marquee') {
      const seam = await demo.locator('[data-motion-track]').evaluate((track) => {
        const [first, second] = [...track.children].map((group) => group.getBoundingClientRect());
        return { firstWidth: first.width, secondWidth: second.width, gap: second.left - first.right };
      });
      expect(seam.firstWidth).toBeCloseTo(seam.secondWidth, 3);
      expect(seam.gap).toBeCloseTo(0, 3);
      await expect(demo.getByRole('list')).toHaveCount(1);
      await demo.locator('[data-motion-track]').locator('..').hover();
      await expect.poll(() => demo.locator('[data-motion-track]').evaluate((element) => getComputedStyle(element).animationPlayState)).toBe('paused');
      evidence.push(seam);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(demo).toHaveAttribute('data-state', 'complete');
    expect(await demo.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    expect(await demo.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
    evidence.push({ kind, before, after });
  }
  const count = page.locator('[data-animation-demo="count-up"]');
  await play(count);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(count.locator('[data-motion-value]')).toHaveText('1,280');
  await testInfo.attach('loop-controls', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

for (const mode of ['reduced-motion', 'no-javascript']) {
  test(`the lesson stays readable with ${mode} on an enlarged 320px screen`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 900 }, javaScriptEnabled: mode !== 'no-javascript', reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference' });
    try {
      const page = await context.newPage();
      expect((await page.goto(lesson))?.status()).toBe(200);
      await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
      await expect(page.locator('pre')).toHaveCount(6);
      await expect(page.locator('[data-animation-demo="count-up"] [data-motion-value]')).toHaveText('1,280');
      await expect(page.locator('[data-animation-demo="typewriter"] [data-motion-value]')).toHaveText('让你的想法，动起来。');
      for (const kind of kinds) {
        const demo = page.locator(`[data-animation-demo="${kind}"]`);
        await expect(demo.getByRole('button')).toHaveCount(0);
        expect(await demo.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
        await testInfo.attach(`${kind}-${mode}`, { body: await demo.screenshot(), contentType: 'image/png' });
      }
      const marquee = page.locator('[data-animation-demo="marquee"]');
      for (const brand of ['NOVA', 'orbit', 'Form', 'MONO']) await expect(marquee.getByRole('listitem').filter({ hasText: brand })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach(`animation-lesson-${mode}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    } finally { await context.close(); }
  });
}
