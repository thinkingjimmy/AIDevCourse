import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const tokenizer = 'https://platform.openai.com/tokenizer';
const metadata = {
  title: 'OpenAI Tokenizer',
  description: 'Explore how text becomes tokens. Compare token IDs and model vocabulary.',
  image: '/images/brand/logo.png',
};
const trigger = (page: Page) => page.locator('#link-previews').getByRole('link', { name: '词元处理器', exact: true });
const card = (page: Page) => page.getByRole('tooltip', { name: '页面预览' });

async function evidence(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

test('link previews open after intent, stay hoverable, and reuse metadata', async ({ page }) => {
  let requests = 0;
  let release!: () => void;
  const ready = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/link-preview?*', async (route) => {
    requests++;
    expect(new URL(route.request().url()).searchParams.get('href')).toBe(tokenizer);
    await ready;
    await route.fulfill({ json: metadata });
  });
  await page.goto('/design/components');
  const link = trigger(page);
  await link.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await page.clock.install();
  await link.hover();
  await page.clock.runFor(150);
  await expect(card(page)).toHaveCount(0);
  expect(requests).toBe(0);
  await page.mouse.move(0, 0);
  await page.clock.runFor(500);
  expect(requests).toBe(0);
  await link.hover();
  await page.clock.runFor(400);
  await expect(card(page)).toBeVisible();
  await expect(card(page).getByRole('status')).toContainText('正在加载页面预览');
  await evidence(page, 'link-preview-loading');
  release();
  await expect(card(page)).toContainText(metadata.title);
  await expect(card(page)).toContainText(metadata.description);
  await expect(card(page)).toContainText('platform.openai.com');
  await expect(link).toHaveAccessibleDescription(new RegExp(metadata.title));
  await expect(card(page).locator('img')).toBeVisible();
  await expect(link).toHaveAttribute('href', tokenizer);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(link).toHaveAttribute('aria-describedby', await card(page).getAttribute('id') ?? '');
  const box = await card(page).boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2, { steps: 8 });
  await page.clock.runFor(500);
  await expect(card(page)).toBeVisible();
  await evidence(page, 'link-preview-desktop');
  const accessibility = await new AxeBuilder({ page }).include('[data-slot="link-preview"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.mouse.move(0, 0);
  await card(page).hover();
  await page.keyboard.press('Escape');
  await page.clock.runFor(500);
  await expect(card(page)).toHaveCount(0);
  await page.mouse.move(0, 0);
  await page.clock.runFor(250);
  await expect(card(page)).toHaveCount(0);
  await link.hover();
  await page.clock.runFor(400);
  await expect(card(page)).toContainText(metadata.title);
  expect(requests).toBe(1);
  await test.info().attach('Hover and cache evidence', { body: JSON.stringify({ requests, box, metadata }, null, 2), contentType: 'application/json' });
});

test('keyboard previews use real local metadata and Escape preserves link focus', async ({ page, request }) => {
  test.skip(process.env.CONTENT_TEST === '1', 'The local example belongs to the published LLM 101 catalog.');
  const response = await request.get('/api/link-preview', { params: { href: '/zh/courses/llm-101' } });
  expect(response.status()).toBe(200);
  const local = await response.json();
  expect(local.title).toBe('LLM 101');
  expect(local.description).not.toBe('');
  await page.goto('/design/components');
  const link = page.locator('#link-previews').getByRole('link', { name: 'LLM 101 课程' });
  await link.focus();
  await expect(card(page)).toContainText(local.title);
  await expect(card(page)).toContainText(local.description);
  await evidence(page, 'link-preview-keyboard');
  await page.keyboard.press('Escape');
  await expect(card(page)).toHaveCount(0);
  await expect(link).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/zh/courses/llm-101');
  await test.info().attach('Local preview response', { body: JSON.stringify(local, null, 2), contentType: 'application/json' });
});

for (const failure of ['unavailable', 'upstream-error', 'network', 'timeout', 'broken-image'] as const) {
  test(`link previews recover from ${failure}`, async ({ page }) => {
    await page.route('**/api/link-preview?*', async (route) => {
      if (failure === 'network') await route.abort();
      else if (failure === 'unavailable') await route.fulfill({ status: 204 });
      else if (failure === 'upstream-error') await route.fulfill({ status: 502, json: { error: 'Preview unavailable' } });
      else if (failure === 'broken-image') await route.fulfill({ json: { ...metadata, image: '/images/missing-preview.png' } });
      // Leave the request pending to verify the browser's real fetch deadline.
    });
    await page.goto('/design/components');
    const link = trigger(page);
    await link.focus();
    if (failure === 'broken-image') {
      await expect(card(page)).toContainText(metadata.title);
      await expect(card(page).locator('img')).toHaveCount(0);
    } else await expect(card(page)).toContainText('暂时无法预览，点击链接查看页面。', { timeout: 10000 });
    await expect(link).toHaveAttribute('href', tokenizer);
    await evidence(page, `link-preview-${failure}`);
    await page.keyboard.press('Escape');
    await expect(link).toBeFocused();
  });
}

for (const scenario of [
  { name: 'narrow', width: 320, fontSize: '16px' },
  { name: 'enlarged', width: 390, fontSize: '24px' },
]) {
  test(`link preview fits ${scenario.name} reading`, async ({ page }) => {
    await page.setViewportSize({ width: scenario.width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/api/link-preview?*', (route) => route.fulfill({ json: { ...metadata, title: metadata.title.repeat(8), description: metadata.description.repeat(8) } }));
    await page.goto('/design/components');
    await page.evaluate((fontSize) => { document.documentElement.style.fontSize = fontSize; }, scenario.fontSize);
    await trigger(page).focus();
    await expect(card(page)).toContainText(metadata.title);
    const box = await card(page).boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(scenario.width);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    await expect(card(page).getByText('platform.openai.com', { exact: true })).toBeInViewport();
    expect(await card(page).evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await evidence(page, `link-preview-${scenario.name}`);
    await test.info().attach('Preview bounds', { body: JSON.stringify(box), contentType: 'application/json' });
  });
}

test('touch links navigate on the first tap without a preview', async ({ browser, baseURL }) => {
  test.skip(process.env.CONTENT_TEST === '1', 'The local example belongs to the published LLM 101 catalog.');
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true });
  try {
    const page = await context.newPage();
    let requests = 0;
    page.on('request', (request) => { if (request.url().includes('/api/link-preview')) requests++; });
    await page.goto('/design/components');
    const local = page.locator('#link-previews').getByRole('link', { name: 'LLM 101 课程' });
    await local.tap();
    await expect(page).toHaveURL('/zh/courses/llm-101');
    expect(requests).toBe(0);
    await expect(page.locator('[data-slot="link-preview"]')).toHaveCount(0);
    await evidence(page, 'link-preview-touch-navigation');
  } finally { await context.close(); }
});

test('no-JavaScript links and same-page anchors keep native navigation', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/design/components');
    await expect(trigger(page)).toHaveAttribute('href', tokenizer);
    const section = page.locator('#link-previews');
    await expect(section.locator('a[href^="#"][data-link-preview]')).toHaveCount(0);
    await expect(section.locator('a[href^="mailto:"][data-link-preview]')).toHaveCount(0);
    await section.getByRole('link', { name: '返回写作说明' }).click();
    await expect(page).toHaveURL(/#authoring$/);
    await section.scrollIntoViewIfNeeded();
    await evidence(page, 'link-preview-no-js');
    if (process.env.CONTENT_TEST !== '1') {
      await section.getByRole('link', { name: 'LLM 101 课程' }).click();
      await expect(page).toHaveURL('/zh/courses/llm-101');
    }
  } finally { await context.close(); }
});

test('published tokenizer text uses the shared page-preview component', async ({ page }) => {
  test.skip(process.env.CONTENT_TEST === '1', 'The Token lesson belongs to the published catalog.');
  await page.route('**/api/link-preview?*', (route) => route.fulfill({ json: metadata }));
  await page.goto('/zh/courses/llm-101/what-is-a-token');
  const link = page.getByRole('link', { name: '词元处理器', exact: true });
  await expect(link).toHaveAttribute('data-link-preview', '');
  await expect(link).toHaveAttribute('href', tokenizer);
  await link.focus();
  await expect(card(page)).toContainText(metadata.title);
  await evidence(page, 'tokenizer-article-preview');
});

test('preview API rejects arbitrary and private destinations', async ({ request }) => {
  const cases = ['', 'https://unpublished.example/page', 'http://127.0.0.1:3310/', 'https://169.254.169.254/', 'https://[::1]/', 'file:///etc/passwd', 'javascript:alert(1)', 'https://platform.openai.com/tokenizer?unlisted=true', 'x'.repeat(2049)];
  const results = [];
  for (const href of cases) {
    const response = await request.get('/api/link-preview', { params: { href } });
    expect(response.status()).toBe(href === '' || href.length > 2048 ? 400 : 404);
    results.push({ href, status: response.status() });
  }
  await test.info().attach('Preview destination policy', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
});
