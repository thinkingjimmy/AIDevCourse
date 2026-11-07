import { test, expect, type Locator, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { localePath } from '../../../../src/lib/i18n/routing';
import type { Locale } from '../../../../src/lib/i18n/config';

export const slugs = ['how-language-models-are-trained', 'how-model-thinking-works', 'how-models-see-and-hear', 'open-models-and-local-deployment', 'how-to-choose-a-language-model'];
export const path = (locale: Locale, slug?: string) => localePath(locale, `/courses/llm-101${slug ? `/${slug}` : ''}`);

export async function mockEmbeds(page: Page) {
  await page.route('https://platform.twitter.com/widgets.js', (route) => route.fulfill({
    contentType: 'application/javascript', body: 'window.twttr = { widgets: { createTweet: async () => undefined } };',
  }));
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><html lang="en"><title>Video fixture</title><body>Video fixture</body></html>',
  }));
}

export async function capture(locator: Locator, name: string) {
  const page = locator.page();
  const viewport = page.viewportSize()!;
  const height = Math.ceil((await locator.boundingBox())!.height);
  await page.setViewportSize({ ...viewport, height: Math.max(viewport.height, height + 320) });
  try {
    await locator.scrollIntoViewIfNeeded();
    const box = (await locator.boundingBox())!;
    const x = Math.max(0, box.x - 8);
    const y = Math.max(0, box.y - 16);
    await test.info().attach(name, { body: await page.screenshot({
      clip: { x, y, width: Math.min(viewport.width - x, box.width + 16), height: box.height + 32 },
      animations: 'disabled', style: 'header, .mobile-course-bar, button.sticky { visibility: hidden !important; }',
    }), contentType: 'image/png' });
  } finally { await page.setViewportSize(viewport); }
}

export async function expectFits(locator: Locator) {
  const page = locator.page();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const geometry = await locator.evaluate((root) => {
    const bounds = root.getBoundingClientRect();
    const overflow = [...root.querySelectorAll<HTMLElement>('button, [data-training-formula-candidate], [data-coefficient-value], [data-training-probability], [data-training-target], [data-training-history] li, [data-training-comparison-note] p')]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width && (box.left < bounds.left - 1 || box.right > bounds.right + 1 || element.scrollWidth > element.clientWidth + 1);
      }).map((element) => ({ text: element.textContent, width: element.clientWidth, scrollWidth: element.scrollWidth }));
    const note = root.querySelector('[data-training-comparison-note] p')?.getBoundingClientRect();
    const collisions = note ? [...root.querySelectorAll('[data-training-coefficient], [data-training-score], [data-training-probabilities]')].filter((element) => {
      const box = element.getBoundingClientRect();
      return note.left < box.right && note.right > box.left && note.top < box.bottom && note.bottom > box.top;
    }).map((element) => element.textContent) : [];
    return { width: root.clientWidth, scrollWidth: root.scrollWidth, overflow, collisions };
  });
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.overflow).toEqual([]);
  expect(geometry.collisions).toEqual([]);
  return geometry;
}

export async function verifyImage(image: Locator, file: string) {
  await image.scrollIntoViewIfNeeded();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await expect(image).toHaveAttribute('alt', /.+/);
  const url = new URL((await image.getAttribute('src'))!, image.page().url());
  const response = await image.page().request.get(url.searchParams.get('url') ?? url.pathname);
  expect(response.ok()).toBe(true);
  const digest = (data: Buffer) => createHash('sha256').update(data).digest('hex');
  const hash = digest(await response.body());
  expect(hash).toBe(digest(readFileSync(file)));
  return { file, hash, alt: await image.getAttribute('alt') };
}

export async function readFormula(model: Locator) {
  const data = await model.evaluate((root) => {
    const probabilities = [...root.querySelectorAll('[data-training-probability]')].map((element) => Number(element.textContent?.replace('%', '')));
    return [...root.querySelectorAll('[data-training-formula-candidate]')].map((row, index) => ({
      id: row.getAttribute('data-candidate-id'), label: row.getAttribute('data-training-formula-candidate'),
      coefficients: [...row.querySelectorAll('[data-coefficient-value]')].map((element) => Number(element.textContent)),
      score: Number(row.querySelector('[data-training-score]')?.textContent), probability: probabilities[index],
    }));
  });
  const total = data.reduce((sum, item) => sum + Math.exp(item.score), 0);
  for (const item of data) {
    expect(item.coefficients[0] + item.coefficients[1]).toBeCloseTo(item.score, 10);
    expect(Math.round(Math.exp(item.score) / total * 100)).toBe(item.probability);
  }
  expect(data.reduce((sum, item) => sum + item.probability, 0)).toBe(100);
  return data;
}
