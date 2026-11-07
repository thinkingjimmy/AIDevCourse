import { test, expect } from '@playwright/test';
import { record, sample } from './motion-probe';

const path = '/zh/animation-vocabulary/entrances-and-exits';
test.use({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'no-preference' });

test('fade changes only opacity and can reverse during playback', async ({ page }, testInfo) => {
  await page.goto(path);
  await expect(page.locator('.entrance-demo[data-ready="true"]')).toHaveCount(6);
  for (const id of ['fade', 'slide-in', 'scale-in', 'pop-in', 'reveal', 'enter-exit']) {
    expect(await sample(page.locator(`#${id}`))).toMatchObject({ opacity: 1, x: 0, y: 0, scale: 1, phase: 'visible' });
  }
  const card = page.locator('#fade');
  await card.getByRole('button', { name: '慢速播放' }).click();
  const reversal = await record(card.getByRole('button', { name: '淡出', exact: true }), true);
  expect(reversal.reversal).toBeDefined();
  expect(reversal.frames.every(frame => frame.x === 0 && frame.y === 0 && frame.scale === 1)).toBe(true);
  const minimum = Math.min(...reversal.frames.map(frame => frame.opacity));
  expect(minimum).toBeGreaterThan(reversal.reversal!.opacity - 0.15);
  await expect(card.locator('.entrance-demo')).toHaveAttribute('data-phase', 'visible');
  const exit = await record(card.getByRole('button', { name: '淡出', exact: true }));
  expect(exit.frames.some(frame => frame.opacity > 0.1 && frame.opacity < 0.9)).toBe(true);
  await expect(card.locator('.entrance-target')).toHaveCSS('opacity', '0');
  await expect(card.locator('[data-animation-sample]')).toHaveCount(1);
  await testInfo.attach('Fade and reversal observations', { body: JSON.stringify({ reversal, exit }, null, 2), contentType: 'application/json' });
});

test('Animate UI effects and the reveal have distinct motion, replay and slow playback', async ({ page }, testInfo) => {
  test.setTimeout(45000);
  await page.goto(path);
  const evidence: Record<string, unknown> = {};
  for (const id of ['slide-in', 'scale-in', 'pop-in', 'reveal']) {
    const card = page.locator(`#${id}`);
    const normal = await record(card.getByRole('button', { name: '重播', exact: true }));
    await card.getByRole('button', { name: '慢速播放' }).click();
    const slow = await record(card.getByRole('button', { name: '重播', exact: true }));
    expect(slow.elapsed).toBeGreaterThan(normal.elapsed * 2);
    const frames = slow.frames;
    if (id === 'slide-in') {
      expect(Math.min(...frames.map(frame => frame.x))).toBeLessThan(-100);
      expect(frames.every(frame => frame.y === 0)).toBe(true);
    }
    if (id === 'scale-in') {
      expect(Math.min(...frames.map(frame => frame.scale))).toBeLessThan(0.96);
      expect(Math.max(...frames.map(frame => frame.scale))).toBeLessThanOrEqual(1);
      expect(frames.some(frame => frame.opacity > 0 && frame.opacity < 1)).toBe(true);
    }
    if (id === 'pop-in') expect(Math.max(...frames.map(frame => frame.scale))).toBeGreaterThan(1.0005);
    if (id === 'reveal') {
      expect(new Set(frames.map(frame => frame.clip)).size).toBeGreaterThan(3);
      expect(frames.every(frame => frame.x === 0 && frame.y === 0 && frame.scale === 1 && frame.opacity === 1)).toBe(true);
    }
    expect(await sample(card)).toMatchObject({ x: 0, y: 0, scale: 1, opacity: 1, phase: 'visible' });
    evidence[id] = { normal, slow };
  }
  const slide = page.locator('#slide-in');
  for (const direction of ['right', 'top', 'bottom']) {
    await slide.getByRole('combobox').selectOption(direction);
    expect(await sample(slide)).toMatchObject({ x: 0, y: 0, phase: 'visible' });
    const observation = await record(slide.getByRole('button', { name: '重播', exact: true }));
    if (direction === 'right') expect(Math.max(...observation.frames.map(frame => frame.x))).toBeGreaterThan(100);
    if (direction === 'top') expect(Math.min(...observation.frames.map(frame => frame.y))).toBeLessThan(-100);
    if (direction === 'bottom') expect(Math.max(...observation.frames.map(frame => frame.y))).toBeGreaterThan(100);
    evidence[direction] = observation;
  }
  await testInfo.attach('Observed animation frames', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});

test('presence keeps the notification mounted through exit and supports interruption', async ({ page }, testInfo) => {
  await page.goto(`${path}#enter-exit`);
  const card = page.locator('#enter-exit');
  await card.getByRole('button', { name: '慢速播放' }).click();
  const reversal = await record(card.getByRole('button', { name: '移除', exact: true }), true);
  expect(reversal.reversal).toBeDefined();
  expect(reversal.frames.every(frame => frame.present)).toBe(true);
  expect(Math.min(...reversal.frames.map(frame => frame.opacity))).toBeGreaterThan(reversal.reversal!.opacity - 0.15);
  await expect(card.locator('[data-animation-sample]')).toHaveCount(1);
  const exit = await record(card.getByRole('button', { name: '移除', exact: true }));
  expect(exit.frames.some(frame => frame.phase === 'exiting' && frame.present && frame.opacity > 0 && frame.opacity < 1)).toBe(true);
  await expect(card.locator('[data-animation-sample]')).toHaveCount(0);
  await expect(card.getByRole('status')).toHaveText('已隐藏');
  const enter = await record(card.getByRole('button', { name: '添加', exact: true }));
  expect(enter.elapsed).toBeGreaterThan(exit.elapsed);
  expect(enter.frames.some(frame => frame.y > 0 && frame.opacity > 0 && frame.opacity < 1)).toBe(true);
  await expect(card.locator('[data-animation-sample]')).toHaveCount(1);
  await expect(card.getByRole('status')).toHaveText('已显示');
  await testInfo.attach('Presence and reversal observations', { body: JSON.stringify({ reversal, exit, enter }, null, 2), contentType: 'application/json' });
});

test('reduced motion settles active playback and keeps every keyboard control usable', async ({ page }, testInfo) => {
  await page.goto(path);
  const fade = page.locator('#fade');
  await fade.getByRole('button', { name: '慢速播放' }).click();
  await fade.getByRole('button', { name: '淡出', exact: true }).click();
  await expect(fade.locator('.entrance-demo')).toHaveAttribute('data-phase', 'exiting');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(fade.locator('.entrance-demo')).toHaveAttribute('data-phase', 'hidden');
  expect(await sample(fade)).toMatchObject({ opacity: 0, phase: 'hidden' });
  await fade.getByRole('button', { name: '淡入', exact: true }).click();
  for (const id of ['fade', 'slide-in', 'scale-in', 'pop-in', 'reveal', 'enter-exit']) {
    const card = page.locator(`#${id}`);
    const action = card.locator('.entrance-controls button').first();
    await action.focus();
    await action.press('Enter');
    await expect(card.locator('.entrance-demo')).toHaveAttribute('data-phase', id === 'fade' || id === 'enter-exit' ? 'hidden' : 'visible');
    await expect(card.locator('.entrance-reduced-note')).toBeVisible();
    const current = await sample(card);
    expect(current.x).toBe(0);
    expect(current.y).toBe(0);
    expect(current.scale).toBe(1);
    if (id === 'fade' || id === 'enter-exit') {
      expect(current.opacity).toBe(0);
      await action.press('Enter');
      await expect(card.locator('.entrance-demo')).toHaveAttribute('data-phase', 'visible');
    }
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const id of ['fade', 'slide-in', 'scale-in', 'pop-in', 'reveal', 'enter-exit']) {
    expect(await sample(page.locator(`#${id}`))).toMatchObject({ x: 0, y: 0, scale: 1, opacity: 1, phase: 'visible' });
  }
  await testInfo.attach('Motion preference restoration', { body: await page.screenshot(), contentType: 'image/png' });
});
