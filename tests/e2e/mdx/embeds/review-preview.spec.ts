import { expect, test, type Page } from '@playwright/test';

const previewPath = process.env.CONTENT_TEST === '1'
  ? '/embed/en/ai-coding/first-change'
  : '/embed/zh/getting-started/faq';

async function openPreview(page: Page, sandbox = false) {
  await page.addInitScript(() => {
    if (window !== window.top) return;
    window.addEventListener('message', event => {
      const frame = document.querySelector('iframe');
      if (event.source === frame?.contentWindow && event.data?.type === 'dsh-tutorial-review-preview-ready') {
        document.body.dataset.previewReady = String(Number(document.body.dataset.previewReady ?? 0) + 1);
      }
    });
  });
  await page.route('**/__review-preview-host', route => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><title>Review host</title><iframe title="Lesson preview"
      ${sandbox ? 'sandbox="allow-scripts"' : ''} src="${previewPath}"></iframe>`,
  }));
  await page.goto('/__review-preview-host');
  return page.frameLocator('iframe');
}

test('review preview hydrates without an inline script warning', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && message.text().includes('Encountered a script tag')) errors.push(message.text());
  });
  await page.addInitScript(() => {
    if (!location.pathname.startsWith('/embed/')) return;
    // Exercise hydration when a preview host removes the legacy inline notifier.
    const observer = new MutationObserver(() => {
      const inline = [...document.querySelectorAll('body > script:not([src])')]
        .find(script => script.textContent?.startsWith('window.parent.postMessage('));
      if (inline) {
        inline.remove();
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', () => observer.disconnect(), { once: true });
  });

  const preview = await openPreview(page);
  await expect(preview.locator('[data-slot="lesson-completion"] button')).toBeEnabled();
  await expect(page.locator('body')).toHaveAttribute('data-preview-ready', '1');
  await testInfo.attach('Preview hydration', { body: JSON.stringify({ readyMessages: 1, errors }), contentType: 'application/json' });
  expect(errors).toEqual([]);
});

test('sandboxed review preview reports ready without the Next.js client bundles', async ({ page }, testInfo) => {
  const blocked: string[] = [];
  await page.route(url => url.pathname.startsWith('/_next/static/') && url.pathname.endsWith('.js'), route => {
    blocked.push(new URL(route.request().url()).pathname);
    return route.abort();
  });
  const preview = await openPreview(page, true);
  await expect(preview.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(preview.locator('[data-slot="lesson-completion"] button')).toBeDisabled();
  await expect(page.locator('body')).toHaveAttribute('data-preview-ready', '1');
  expect(blocked.length).toBeGreaterThan(0);
  await testInfo.attach('Standalone preview readiness', {
    body: JSON.stringify({ readyMessages: 1, blockedBundles: blocked.length }),
    contentType: 'application/json',
  });
});
