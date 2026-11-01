import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { attachRequests, capture, mockEmbeds, preview, scriptURL } from './fixtures';

for (const scenario of [
  { name: 'desktop', width: 1280, height: 960 },
  { name: 'narrow', width: 320, height: 844 },
  { name: 'enlarged', width: 390, height: 844 },
]) {
  test(`embeds load on demand and fit ${scenario.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize(scenario);
    const requests = await mockEmbeds(page);
    const response = await page.goto(`${preview}?lang=en`);
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    expect(requests).toEqual([]);
    if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
    const section = page.locator('#embeds');
    const videos = section.locator('[data-embed="youtube"]');
    const posts = section.locator('[data-embed="x"]');
    await expect(videos).toHaveCount(2);
    await expect(posts).toHaveCount(2);
    const measurements = [];
    for (const video of await videos.all()) {
      await video.scrollIntoViewIfNeeded();
      const frame = video.locator('iframe');
      await expect(frame).toHaveAttribute('loading', 'lazy');
      await expect(frame).toHaveAttribute('allowfullscreen', '');
      await expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      const url = new URL((await frame.getAttribute('src'))!);
      expect(url.origin).toBe('https://www.youtube-nocookie.com');
      expect(url.pathname).toBe('/embed/M7lc1UVf-VE');
      expect(url.searchParams.get('start')).toBe('90');
      expect(url.searchParams.get('autoplay')).not.toBe('1');
      expect(url.searchParams.get('playsinline')).toBe('1');
      expect(url.searchParams.get('hl')).toBe('en');
      const rect = await frame.boundingBox();
      expect(rect!.height).toBeGreaterThanOrEqual(200);
      measurements.push(rect);
      await expect(video.getByRole('link', { name: 'Watch on YouTube' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=M7lc1UVf-VE&t=90s');
    }
    await expect(videos.first().locator('iframe')).toHaveAccessibleName('YouTube player demonstration');
    await expect(videos.nth(1).locator('iframe')).toHaveAccessibleName('YouTube video');
    for (const post of await posts.all()) {
      await post.scrollIntoViewIfNeeded();
      await expect(post).toHaveAttribute('data-state', 'ready');
      const frame = post.locator('iframe');
      await expect(frame).toHaveCount(1);
      const url = new URL((await frame.getAttribute('src'))!);
      expect(url.searchParams.get('dnt')).toBe('true');
      expect(url.searchParams.get('lang')).toBe('en');
      await expect(post.locator('figcaption')).toBeHidden();
      await expect(post.getByRole('link', { name: 'View on X' })).toHaveCount(0);
    }
    expect(requests.filter((url) => url === scriptURL)).toHaveLength(1);
    const source = videos.first().getByRole('link', { name: 'Watch on YouTube' });
    await source.focus();
    await expect(source).toBeFocused();
    await expect(source).toHaveAttribute('target', '_blank');
    expect(await source.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await expect(section.getByRole('link', { name: 'A normal YouTube link' })).toHaveAttribute('data-link-preview', '');
    expect(await section.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).include('#embeds').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await capture(videos.first(), `youtube-${scenario.name}`);
    await capture(posts.first(), `x-${scenario.name}`);
    expect(errors).toEqual([]);
    await attachRequests(requests);
    await test.info().attach('embed-layout', { body: JSON.stringify({ measurements, errors }, null, 2), contentType: 'application/json' });
  });
}

test('original links remain available without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 844 } });
  try {
    const page = await context.newPage();
    const requests = await mockEmbeds(page);
    await page.goto(`${preview}?lang=en#embeds`);
    const section = page.locator('#embeds');
    await expect(section.getByRole('link', { name: 'View on X' })).toHaveCount(2);
    await expect(section.getByRole('link', { name: 'Watch on YouTube' })).toHaveCount(2);
    await expect(section.locator('[data-embed="x"]').getByRole('status')).toHaveCount(0);
    expect(requests).not.toContain(scriptURL);
    const post = section.locator('[data-embed="x"]').first();
    await post.scrollIntoViewIfNeeded();
    await expect(post.getByRole('link')).toBeVisible();
    await capture(post, 'x-no-javascript');
    await capture(section.locator('[data-embed="youtube"]').first(), 'youtube-no-javascript');
    await attachRequests(requests);
  } finally { await context.close(); }
});

test('CSP permits platform frames and blocks unrelated frames', async ({ page }) => {
  await mockEmbeds(page);
  const response = await page.goto(preview);
  const csp = response!.headers()['content-security-policy'];
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  const framePolicy = csp.split(';').find((directive) => directive.trim().startsWith('frame-src'))!.trim().split(/\s+/).slice(1);
  expect(framePolicy.sort()).toEqual(['https://www.youtube-nocookie.com', 'https://platform.twitter.com', 'https://syndication.twitter.com', 'https://platform.x.com', 'https://syndication.x.com'].sort());
  const violation = await page.evaluate(() => new Promise<{ directive: string; uri: string }>((resolve) => {
    const frame = document.createElement('iframe');
    document.addEventListener('securitypolicyviolation', (event) => {
      if (event.violatedDirective === 'frame-src') {
        frame.remove();
        resolve({ directive: event.violatedDirective, uri: event.blockedURI });
      }
    });
    frame.src = 'https://untrusted.example/embed';
    document.body.append(frame);
  }));
  expect(violation.uri).toContain('https://untrusted.example');
  await test.info().attach('embed-csp', { body: JSON.stringify({ csp, violation }, null, 2), contentType: 'application/json' });
});

test('client navigation remounts each post without reloading the script', async ({ page }) => {
  const requests = await mockEmbeds(page);
  await page.goto(`${preview}?lang=en#embeds`);
  const post = page.locator('[data-embed="x"]').first();
  await post.scrollIntoViewIfNeeded();
  await expect(post).toHaveAttribute('data-state', 'ready');
  await page.evaluate(() => { document.documentElement.dataset.embedNavigation = 'same-document'; });
  await page.getByRole('link', { name: 'AIDevCourse', exact: true }).first().click();
  await expect(page).toHaveURL(/\/design$/);
  await expect(page.locator('[data-embed]')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/design\/components/);
  await post.scrollIntoViewIfNeeded();
  await expect(post).toHaveAttribute('data-state', 'ready');
  await expect(post.locator('iframe')).toHaveCount(1);
  expect(await page.locator('html').getAttribute('data-embed-navigation')).toBe('same-document');
  expect(requests.filter((url) => url === scriptURL)).toHaveLength(1);
  await capture(post, 'x-client-navigation');
  await attachRequests(requests);
});
