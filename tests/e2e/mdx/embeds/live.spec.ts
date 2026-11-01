import { test, expect } from '@playwright/test';
import { attachRequests, capture, preview } from './fixtures';

test('record real platform availability separately from controlled checks', async ({ page, browserName }) => {
  test.skip(process.env.EMBED_LIVE !== '1' || browserName !== 'chromium', 'Enable EMBED_LIVE=1 for the real-network smoke check.');
  test.setTimeout(60000);
  const requests: string[] = [];
  const failures: { url: string; error: string | null }[] = [];
  const responses: { url: string; status: number }[] = [];
  const errors: string[] = [];
  const posts: { url: string | null; state: string | null }[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (/twitter\.com|x\.com|youtube-nocookie\.com/.test(request.url())) requests.push(request.url()); });
  page.on('requestfailed', (request) => { if (/twitter\.com|x\.com|youtube-nocookie\.com/.test(request.url())) failures.push({ url: request.url(), error: request.failure()?.errorText ?? null }); });
  page.on('response', (response) => { if (/twitter\.com|x\.com|youtube-nocookie\.com/.test(response.url())) responses.push({ url: response.url(), status: response.status() }); });
  expect((await page.goto(`${preview}?lang=en#embeds`))?.status()).toBe(200);
  const video = page.locator('[data-embed="youtube"]').first();
  await video.scrollIntoViewIfNeeded();
  await expect(video.getByRole('link', { name: 'Watch on YouTube' })).toBeVisible();
  for (const [index, post] of (await page.locator('[data-embed="x"]').all()).entries()) {
    await post.scrollIntoViewIfNeeded();
    await expect(post).toHaveAttribute('data-state', /ready|unavailable/, { timeout: 25000 });
    const link = post.locator('figcaption a');
    const state = await post.getAttribute('data-state');
    if (state === 'ready') {
      await expect(post.locator('iframe')).toBeVisible();
      await expect(link).toBeHidden();
    } else await expect(link).toBeVisible();
    posts.push({ url: await link.getAttribute('href'), state });
    await capture(post, `live-x-${index + 1}`);
  }
  const youtubeFrameLoaded = responses.some((response) => response.url.startsWith('https://www.youtube-nocookie.com/embed/') && response.status === 200);
  test.info().annotations.push({ type: 'platform-availability', description: `X posts rendered: ${posts.filter((post) => post.state === 'ready').length}/${posts.length}; YouTube frame HTTP 200: ${youtubeFrameLoaded}. This does not verify video playback.` });
  await capture(video, 'live-youtube');
  await attachRequests(requests);
  await test.info().attach('live-platform-availability', { body: JSON.stringify({ posts, youtubeFrameLoaded, responses, failures, errors, playbackVerified: false }, null, 2), contentType: 'application/json' });
});
