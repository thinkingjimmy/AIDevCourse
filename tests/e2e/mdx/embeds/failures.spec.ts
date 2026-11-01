import { test, expect } from '@playwright/test';
import { attachRequests, capture, mockEmbeds, preview, scriptURL, type WidgetMode } from './fixtures';

for (const scenario of [
  { name: 'script error', script: 'abort' as const },
  { name: 'script timeout', script: 'unready' as const, advance: 11000 },
  { name: 'unavailable post', widget: 'reject' as WidgetMode },
  { name: 'empty post', widget: 'empty' as WidgetMode },
  { name: 'render timeout', widget: 'hang' as WidgetMode, advance: 16000 },
  { name: 'late render', widget: 'late' as WidgetMode, advance: 16000 },
]) {
  test(`X preserves a usable source link after ${scenario.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const requests = await mockEmbeds(page, scenario);
    await page.clock.install();
    await page.goto(`${preview}?lang=en`);
    const post = page.locator('[data-embed="x"]').first();
    await post.scrollIntoViewIfNeeded();
    if (scenario.advance) {
      await expect(post).toHaveAttribute('data-state', 'loading');
      await expect(post.locator('figcaption')).toBeHidden();
      if (scenario.widget === 'late') await expect(page.locator('script[data-x-widgets]')).toHaveAttribute('data-loaded', 'true');
      await page.clock.runFor(scenario.advance);
    }
    await expect(post).toHaveAttribute('data-state', 'unavailable');
    await expect(post.getByRole('status')).toHaveText('This embed could not load. Open the original link.');
    await expect(post.getByRole('link', { name: 'View on X' })).toBeVisible();
    await post.getByRole('link', { name: 'View on X' }).focus();
    await expect(post.getByRole('link', { name: 'View on X' })).toBeFocused();
    if (scenario.widget === 'late') await page.clock.runFor(10000);
    await expect(post.locator('iframe')).toHaveCount(0);
    await capture(post, `x-${scenario.name.replaceAll(' ', '-')}`);
    expect(errors).toEqual([]);
    await attachRequests(requests);
  });
}

test('a blocked YouTube frame keeps its original link', async ({ page }) => {
  const requests = await mockEmbeds(page, { youtube: 'abort' });
  await page.goto(`${preview}?lang=en#embeds`);
  const video = page.locator('[data-embed="youtube"]').first();
  await video.scrollIntoViewIfNeeded();
  const link = video.getByRole('link', { name: 'Watch on YouTube' });
  await expect(link).toBeVisible();
  await link.focus();
  await expect(link).toBeFocused();
  await capture(video, 'youtube-blocked');
  await attachRequests(requests);
});

test('late widget resolution cannot restore content after navigation', async ({ page }) => {
  const requests = await mockEmbeds(page, { widget: 'late' });
  await page.clock.install();
  await page.goto(`${preview}?lang=en#embeds`);
  await page.locator('[data-embed="x"]').first().scrollIntoViewIfNeeded();
  await expect(page.locator('[data-embed="x"]').first()).toHaveAttribute('data-state', 'loading');
  await expect(page.locator('script[data-x-widgets]')).toHaveAttribute('data-loaded', 'true');
  await page.getByRole('link', { name: 'AIDevCourse', exact: true }).first().click();
  await expect(page).toHaveURL(/\/design$/);
  await page.clock.runFor(22000);
  await expect(page.locator('[data-embed], iframe')).toHaveCount(0);
  await attachRequests(requests);
});

test('one unavailable post does not prevent another post from loading', async ({ page }) => {
  const requests = await mockEmbeds(page, { widget: 'mixed' });
  await page.goto(`${preview}?lang=en#embeds`);
  const posts = page.locator('[data-embed="x"]');
  await posts.first().scrollIntoViewIfNeeded();
  await expect(posts.first()).toHaveAttribute('data-state', 'unavailable');
  await posts.nth(1).scrollIntoViewIfNeeded();
  await expect(posts.nth(1)).toHaveAttribute('data-state', 'ready');
  expect(requests.filter((url) => url === scriptURL)).toHaveLength(1);
  await capture(posts.nth(1), 'x-independent-post');
  await attachRequests(requests);
});

test('a failed script can load again after client navigation', async ({ page }) => {
  const failedRequests = await mockEmbeds(page, { script: 'abort' });
  await page.goto(`${preview}?lang=en#embeds`);
  const post = page.locator('[data-embed="x"]').first();
  await post.scrollIntoViewIfNeeded();
  await expect(post).toHaveAttribute('data-state', 'unavailable');
  await page.getByRole('link', { name: 'AIDevCourse', exact: true }).first().click();
  await expect(page).toHaveURL(/\/design$/);
  const recoveredRequests = await mockEmbeds(page);
  await page.goBack();
  await post.scrollIntoViewIfNeeded();
  await expect(post).toHaveAttribute('data-state', 'ready');
  expect(failedRequests.filter((url) => url === scriptURL)).toHaveLength(1);
  expect(recoveredRequests.filter((url) => url === scriptURL)).toHaveLength(1);
  await capture(post, 'x-script-recovered');
  await attachRequests([...failedRequests, ...recoveredRequests]);
});

for (const [locale, loading, unavailable, source, videoTitle] of [
  ['zh', '正在加载 X 帖子…', '无法加载嵌入内容，请打开原站链接。', '在 X 上查看', 'YouTube 视频'],
  ['ja', 'X のポストを読み込み中…', '埋め込みを読み込めませんでした。元のリンクを開いてください。', 'X で見る', 'YouTube 動画'],
  ['fr', 'Chargement de la publication X…', 'Impossible de charger ce contenu intégré. Ouvrez le lien original.', 'Voir sur X', 'Vidéo YouTube'],
  ['es', 'Cargando publicación de X…', 'No se pudo cargar el contenido. Abre el enlace original.', 'Ver en X', 'Vídeo de YouTube'],
]) {
  test(`embed status and default names use ${locale}`, async ({ page }) => {
    await mockEmbeds(page, { widget: 'hang' });
    await page.clock.install();
    await page.goto(`${preview}?lang=${locale}#embeds`);
    const post = page.locator('[data-embed="x"]').first();
    await post.scrollIntoViewIfNeeded();
    await expect(post).toHaveAttribute('data-state', 'loading');
    await expect(post.getByRole('status')).toHaveText(loading);
    await expect(post.locator('figcaption')).toBeHidden();
    await expect(page.locator('[data-embed="youtube"]').nth(1).locator('iframe')).toHaveAccessibleName(videoTitle);
    await page.clock.runFor(16000);
    await expect(post.getByRole('status')).toHaveText(unavailable);
    await expect(post.getByRole('link', { name: source })).toBeVisible();
    await capture(post, `x-unavailable-${locale}`);
  });
}
