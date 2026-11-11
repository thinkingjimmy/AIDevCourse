import { test, expect, type Locator, type Page } from '@playwright/test';
import { localePath } from '../../../../src/lib/i18n/routing';
import type { Locale } from '../../../../src/lib/i18n/config';

export const locales = ['en', 'ja', 'fr', 'es'] as const;
export const slugs = ['how-ai-chat-works', 'what-is-a-tool', 'ai-chat-advice', 'ai-chat-tips', 'what-is-an-agent'];
export const path = (locale: Locale, slug?: string) => localePath(locale, `/courses/llm-101${slug ? `/${slug}` : ''}`);

export async function mockEmbeds(page: Page) {
  await page.route('https://platform.twitter.com/widgets.js', (route) => route.fulfill({
    contentType: 'application/javascript', body: 'window.twttr = { widgets: { createTweet: async () => undefined } };',
  }));
}

export async function capture(locator: Locator, name: string) {
  const page = locator.page();
  const viewport = page.viewportSize()!;
  const height = Math.ceil((await locator.boundingBox())!.height);
  await page.setViewportSize({ ...viewport, height: Math.max(viewport.height, height + 320) });
  try {
    await locator.scrollIntoViewIfNeeded();
    await test.info().attach(name, { body: await locator.screenshot({
      animations: 'disabled', style: 'header, .mobile-course-bar, button.sticky { visibility: hidden !important; }',
    }), contentType: 'image/png' });
  } finally { await page.setViewportSize(viewport); }
}

export async function expectFits(locator: Locator) {
  expect(await locator.page().evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const geometry = await locator.evaluate((root) => {
    const bounds = root.getBoundingClientRect();
    const overflow = [...root.querySelectorAll<HTMLElement>('button, label, input, figcaption, [data-newton-equation], [data-newton-insight]')]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width && (box.left < bounds.left - 1 || box.right > bounds.right + 1 || element.scrollWidth > element.clientWidth + 1);
      }).map((element) => ({ text: element.textContent, width: element.clientWidth, scrollWidth: element.scrollWidth }));
    const caption = root.querySelector('figcaption')?.getBoundingClientRect();
    const formula = root.querySelector('figcaption + div')?.getBoundingClientRect();
    return { width: root.clientWidth, scrollWidth: root.scrollWidth, overflow,
      captionOverlap: caption && formula ? caption.bottom > formula.top : false };
  });
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.overflow).toEqual([]);
  expect(geometry.captionOverlap).toBe(false);
  return geometry;
}
