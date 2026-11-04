import { test, expect, type Locator } from '@playwright/test';
import { expectAssembled, expectStill } from './poses';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published Coding 101 card.');

async function readPose(rocket: Locator) {
  return rocket.evaluate((root) => {
    const svg = root.querySelector('svg')!;
    const canvas = svg.getBoundingClientRect();
    const origin = svg.getScreenCTM()!.inverse();
    return [...svg.querySelectorAll<SVGGElement>('[data-asm]')].map((part) => {
      const transform = origin.multiply(part.getScreenCTM()!);
      const box = part.getBoundingClientRect();
      return {
        name: part.dataset.asm,
        dx: transform.e,
        dy: transform.f,
        left: box.left - canvas.left,
        top: box.top - canvas.top,
        right: canvas.right - box.right,
        bottom: canvas.bottom - box.bottom,
      };
    });
  });
}

function expectExploded(pose: Awaited<ReturnType<typeof readPose>>) {
  const byName = Object.fromEntries(pose.map((part) => [part.name, part]));
  expect(Object.keys(byName).sort()).toEqual(['chamber', 'ftp', 'gimbal', 'nozzle']);
  expect(byName.nozzle.dy).toBeCloseTo(0, 5);
  expect(byName.chamber.dy).toBeLessThan(0);
  expect(byName.ftp.dy).toBeLessThan(byName.chamber.dy);
  expect(byName.gimbal.dy).toBeLessThan(byName.ftp.dy);
  for (const part of pose) {
    expect(part.dx).toBeCloseTo(0, 5);
    expect(Math.min(part.left, part.top, part.right, part.bottom)).toBeGreaterThanOrEqual(-0.5);
  }
}

test('rocket expands once on hover with its nozzle fixed in place', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'no-preference',
    recordVideo: { dir: testInfo.outputPath('video') },
  });
  const page = await context.newPage();
  let samples: Promise<{ x: number; y: number }[]> | undefined;
  try {
    await page.goto('/zh');
    const card = page.getByRole('link', { name: 'Coding 101', exact: true });
    const rocket = card.locator('[data-anatomy="rocket"]');
    await card.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expectAssembled(rocket);
    await expectStill(rocket);
    const assembled = await readPose(rocket);

    samples = page.evaluate(async () => {
      const svg = document.querySelector<SVGSVGElement>('[data-anatomy="rocket"] svg')!;
      const nozzle = svg.querySelector<SVGGElement>('[data-asm="nozzle"]')!;
      const positions: { x: number; y: number }[] = [];
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const sample = () => {
          const transform = svg.getScreenCTM()!.inverse().multiply(nozzle.getScreenCTM()!);
          positions.push({ x: transform.e, y: transform.f });
          if (performance.now() - start >= 5000) resolve();
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      return positions;
    });

    const joint = await rocket.evaluate((root) => {
      const svg = root.querySelector('svg')!;
      const nozzle = svg.querySelector<SVGGElement>('[data-asm="nozzle"]')!.getBBox();
      const chamber = svg.querySelector<SVGGElement>('[data-asm="chamber"]')!.getBBox();
      const left = Math.max(nozzle.x, chamber.x), right = Math.min(nozzle.x + nozzle.width, chamber.x + chamber.width);
      const top = Math.max(nozzle.y, chamber.y), bottom = Math.min(nozzle.y + nozzle.height, chamber.y + chamber.height);
      const point = svg.createSVGPoint();
      const overlaps: { x: number; y: number; layers: (string | null | undefined)[] }[] = [];
      for (let row = 1; row < 10; row++) {
        for (let col = 1; col < 10; col++) {
          point.x = left + (right - left) * col / 10;
          point.y = top + (bottom - top) * row / 10;
          const screen = point.matrixTransform(svg.getScreenCTM()!);
          const layers = [...new Set(document.elementsFromPoint(screen.x, screen.y).map((element) => element.closest('[data-asm]')?.getAttribute('data-asm')))];
          if (layers.includes('nozzle') && layers.includes('chamber')) overlaps.push({ x: point.x, y: point.y, layers });
        }
      }
      return overlaps;
    });
    expect(joint.length).toBeGreaterThan(0);
    for (const point of joint) expect(point.layers.indexOf('chamber')).toBeLessThan(point.layers.indexOf('nozzle'));
    await testInfo.attach('rocket-assembled-joint', { body: JSON.stringify(joint, null, 2), contentType: 'application/json' });
    await testInfo.attach('rocket-assembled', { body: await card.screenshot(), contentType: 'image/png' });
    await card.getByRole('heading').hover();
    await expect(rocket).toHaveAttribute('data-settled', 'true');
    const opened = await readPose(rocket);
    expectExploded(opened);
    expect(await card.evaluate((element) => element.matches(':hover'))).toBe(true);
    await expectStill(rocket);
    await testInfo.attach('rocket-exploded', { body: await card.screenshot(), contentType: 'image/png' });

    await page.mouse.move(0, 0);
    await expectAssembled(rocket);
    expect(await readPose(rocket)).toEqual(assembled);
    const positions = await samples;
    expect(positions.length).toBeGreaterThan(10);
    for (const position of positions) {
      expect(position.x).toBeCloseTo(0, 5);
      expect(position.y).toBeCloseTo(0, 5);
    }
    await testInfo.attach('rocket-motion-positions', {
      body: JSON.stringify({ opened, assembled, nozzleFrames: positions }, null, 2),
      contentType: 'application/json',
    });
    await testInfo.attach('course-cards-assembled', {
      body: await page.locator('#catalog').screenshot(),
      contentType: 'image/png',
    });
  } finally {
    await samples?.catch(() => {});
    await context.close();
    const path = await page.video()?.path();
    if (path) await testInfo.attach('rocket-hover-motion', { path, contentType: 'video/webm' });
  }
});

for (const width of [1440, 390, 320]) {
  test(`rocket stays fully visible with reduced motion at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/zh');
    const card = page.getByRole('link', { name: 'Coding 101', exact: true });
    const rocket = card.locator('[data-anatomy="rocket"]');
    await card.scrollIntoViewIfNeeded();
    await expectAssembled(rocket);
    const pose = await readPose(rocket);
    for (const part of pose) {
      expect(part.dx).toBeCloseTo(0, 5);
      expect(part.dy).toBeCloseTo(0, 5);
      expect(Math.min(part.left, part.top, part.right, part.bottom)).toBeGreaterThanOrEqual(-0.5);
    }
    await card.getByRole('heading').hover();
    await expectAssembled(rocket);
    expect(await readPose(rocket)).toEqual(pose);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach(`rocket-reduced-motion-${width}`, { body: await card.screenshot(), contentType: 'image/png' });
  });
}
