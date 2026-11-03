import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const lesson = '/zh/courses/llm-101/ai-chat-tips';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published artifact example.');

async function clickControl(control: Locator) {
  await control.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await control.click();
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`Newton's second law is explicit and interactive on ${viewport.name}`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-11-02T10:00:00Z') });
    await page.clock.pauseAt(new Date('2026-11-02T10:00:01Z'));
    expect((await page.goto(lesson))?.status()).toBe(200);
    const demo = page.getByRole('figure', { name: '牛顿第二定律交互演示' });
    await page.clock.runFor(100);
    await expect(demo).toHaveAttribute('data-ready', 'true');
    await demo.scrollIntoViewIfNeeded();
    await expect(demo.locator('figcaption')).toContainText('牛顿第二定律');
    await expect(demo.getByText('F = ma', { exact: true })).toBeVisible();
    const force = demo.getByRole('slider', { name: '合力 F' });
    const mass = demo.getByRole('slider', { name: '质量 m' });
    const acceleration = demo.locator('[data-newton-acceleration]');
    await expect(force).toHaveValue('4');
    await expect(mass).toHaveValue('2');
    await expect(acceleration).toHaveText('2 m/s²');
    await expect(demo).toHaveAttribute('data-state', 'ready');
    const headingOrder = await demo.evaluate((element) => {
      const headings = [...element.closest('article')!.querySelectorAll('h2')];
      return headings.filter((heading) => heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING).at(-1)?.textContent;
    });
    expect(headingOrder).toContain('一、多用 Artifact 功能');

    const samples = [];
    for (const sample of [
      { force: 8, mass: 2, acceleration: '4 m/s²', insight: '合力加倍，质量不变，加速度也加倍' },
      { force: 4, mass: 4, acceleration: '1 m/s²', insight: '质量加倍，合力不变，加速度减半' },
      { force: 8, mass: 4, acceleration: '2 m/s²', insight: '和对照相同' },
      { force: 0, mass: 2, acceleration: '0 m/s²', insight: '保持静止' },
      { force: 1, mass: 3, acceleration: '0.33 m/s²', insight: '每过 1 秒' },
      { force: 8, mass: 1, acceleration: '8 m/s²', insight: '每过 1 秒' },
    ]) {
      await force.fill(String(sample.force));
      await mass.fill(String(sample.mass));
      await expect(acceleration).toHaveText(sample.acceleration);
      await expect(demo.locator('[data-newton-insight]')).toContainText(sample.insight);
      await expect(force).toHaveAttribute('aria-valuetext', `${sample.force} 牛顿`);
      await expect(mass).toHaveAttribute('aria-valuetext', `${sample.mass} 千克`);
      if (sample.force === 1 && sample.mass === 3) await expect(demo.locator('[data-newton-equation]')).toContainText('≈');
      samples.push({ ...sample, equation: await demo.locator('[data-newton-equation]').innerText() });
    }
    await force.press('Home');
    await expect(force).toHaveValue('0');
    await force.press('End');
    await expect(force).toHaveValue('8');
    await force.press('ArrowLeft');
    await expect(force).toHaveValue('7');
    await mass.press('Home');
    await expect(mass).toHaveValue('1');
    await mass.press('End');
    await expect(mass).toHaveValue('4');
    await clickControl(demo.getByRole('button', { name: '重置', exact: true }));
    await expect(force).toHaveValue('4');
    await expect(mass).toHaveValue('2');

    await force.fill('8');
    await clickControl(demo.getByRole('button', { name: '开始对比', exact: true }));
    await page.clock.runFor(500);
    await expect(demo).toHaveAttribute('data-state', 'playing');
    const cart = demo.locator('[data-newton-cart="current"]');
    const reference = demo.locator('[data-newton-cart="reference"]');
    expect(Number(await cart.getAttribute('x'))).toBeGreaterThan(Number(await reference.getAttribute('x')));
    await clickControl(demo.getByRole('button', { name: '暂停', exact: true }));
    const paused = await demo.getAttribute('data-time');
    await page.clock.runFor(1000);
    await expect(demo).toHaveAttribute('data-time', paused!);
    await clickControl(demo.getByRole('button', { name: '继续', exact: true }));
    await page.clock.runFor(2200);
    await expect(demo).toHaveAttribute('data-state', 'complete');
    await expect(demo).toHaveAttribute('data-time', '2.000');
    await expect(cart).toHaveAttribute('x', '240');
    await expect(reference).toHaveAttribute('x', '136');
    await expect(demo.locator('[data-newton-speed="current"]')).toHaveText('8 m/s');
    await expect(demo.locator('[data-newton-speed="reference"]')).toHaveText('4 m/s');
    const clip = await demo.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return { x: bounds.left + scrollX - 8, y: bounds.top + scrollY - 12, width: bounds.width + 16, height: bounds.height + 20 };
    });
    const screenshot = testInfo.outputPath(`newton-${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true, clip });
    await testInfo.attach(`newton-${viewport.name}`, { path: screenshot, contentType: 'image/png' });

    await clickControl(demo.getByRole('button', { name: '再比一次', exact: true }));
    await page.clock.runFor(200);
    await page.locator('article nav').last().scrollIntoViewIfNeeded();
    await expect(demo).not.toBeInViewport();
    await page.clock.runFor(100);
    await expect(demo).toHaveAttribute('data-state', 'paused');
    const offscreen = await demo.getAttribute('data-time');
    await page.clock.runFor(1000);
    await expect(demo).toHaveAttribute('data-time', offscreen!);
    await demo.scrollIntoViewIfNeeded();
    await mass.fill('4');
    await expect(demo).toHaveAttribute('data-state', 'ready');
    await expect(cart).toHaveAttribute('x', '32');
    await expect(reference).toHaveAttribute('x', '32');
    await page.clock.runFor(500);
    await expect(demo).toHaveAttribute('data-time', '0.000');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await page.clock.resume();
    const accessibility = await new AxeBuilder({ page }).include('[data-newton-demo]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await testInfo.attach(`newton-measurements-${viewport.name}`, { body: JSON.stringify({ samples, errors, accessibilityViolations: accessibility.violations }, null, 2), contentType: 'application/json' });
  });
}

test("Newton's second law respects reduced motion and enlarged narrow layouts", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(lesson);
  await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
  const demo = page.getByRole('figure', { name: '牛顿第二定律交互演示' });
  await expect(demo).toHaveAttribute('data-ready', 'true');
  await clickControl(demo.getByRole('button', { name: '开始对比', exact: true }));
  await expect(demo).toHaveAttribute('data-state', 'complete');
  await expect(demo).toHaveAttribute('data-time', '2.000');
  await expect(demo.getByRole('status')).toContainText('对比完成');
  await demo.getByRole('slider', { name: '合力 F' }).fill('0');
  await clickControl(demo.getByRole('button', { name: '开始对比', exact: true }));
  await expect(demo.locator('[data-newton-cart="current"]')).toHaveAttribute('x', '32');
  await expect(demo.locator('[data-newton-speed="current"]')).toHaveText('0 m/s');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await testInfo.attach('newton-narrow-enlarged', { body: await demo.screenshot(), contentType: 'image/png' });
});

test("Newton's second law retains its explanation without JavaScript", async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 844 }, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    expect((await page.goto(lesson))?.status()).toBe(200);
    const demo = page.getByRole('figure', { name: '牛顿第二定律交互演示' });
    await expect(demo.getByText('F = ma', { exact: true })).toBeVisible();
    await expect(demo.locator('[data-newton-acceleration]')).toHaveText('2 m/s²');
    await expect(demo.getByRole('slider').first()).not.toBeVisible();
    await expect(demo.getByText('质量不变时，合力加倍，加速度也加倍', { exact: false })).toBeVisible();
    await expect(demo.getByText('合力不变时，质量加倍，加速度减半', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach('newton-no-javascript', { body: await demo.screenshot(), contentType: 'image/png' });
  } finally { await context.close(); }
});
