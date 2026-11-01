import { test, type Locator, type Page } from '@playwright/test';

export const preview = '/design/components';
export const scriptURL = 'https://platform.twitter.com/widgets.js';
export type WidgetMode = 'success' | 'reject' | 'empty' | 'hang' | 'late' | 'mixed';

export async function mockEmbeds(page: Page, { widget = 'success', script = 'success', youtube = 'success' }: {
  widget?: WidgetMode; script?: 'success' | 'abort' | 'unready'; youtube?: 'success' | 'abort';
} = {}) {
  const requests: string[] = [];
  await page.route(/^https:\/\/(?:platform|syndication)\.(?:twitter|x)\.com\//, async (route) => {
    const url = route.request().url();
    requests.push(url);
    if (url === scriptURL) {
      if (script === 'abort') return route.abort();
      if (script === 'unready') return route.fulfill({ contentType: 'application/javascript', body: 'window.twttr = { ready: function () {} };' });
      return route.fulfill({ contentType: 'application/javascript', body: `
        window.twttr = { widgets: { createTweet: function (id, container, options) {
          var mode = ${JSON.stringify(widget)};
          if (mode === 'reject' || mode === 'mixed' && id === '133640144317198338') return Promise.reject(new Error('Post unavailable'));
          if (mode === 'empty') return Promise.resolve(undefined);
          if (mode === 'hang') return new Promise(function () {});
          return new Promise(function (resolve) {
            function render() {
              var frame = document.createElement('iframe');
              frame.src = 'https://platform.twitter.com/embed/Tweet.html?' + new URLSearchParams({ id: id, lang: options.lang, dnt: String(options.dnt) });
              frame.title = 'Embedded post';
              frame.style.cssText = 'width:100%;height:280px;border:0';
              container.appendChild(frame);
              resolve(frame);
            }
            if (mode === 'late') setTimeout(render, 20000); else render();
          });
        } } };
      ` });
    }
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>X fixture</title></head><body style="margin:0;padding:24px;box-sizing:border-box;background:#f4f4f5;color:#18181b;font:16px sans-serif"><main><strong>Public X post</strong><p>A controlled official-widget response.</p><a href="https://x.com">View post</a></main></body></html>' });
  });
  await page.route('https://www.youtube-nocookie.com/**', async (route) => {
    requests.push(route.request().url());
    if (youtube === 'abort') return route.abort();
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>YouTube fixture</title></head><body style="margin:0;display:grid;place-items:center;height:100vh;background:#18181b;color:white;font:16px sans-serif"><main><button style="min-height:44px;min-width:44px" aria-label="Play video">Play</button></main></body></html>' });
  });
  return requests;
}

export async function capture(figure: Locator, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await figure.screenshot({ path, animations: 'disabled', style: 'header { visibility: hidden !important; }' });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

export async function attachRequests(requests: string[]) {
  await test.info().attach('embed-requests', { body: JSON.stringify(requests, null, 2), contentType: 'application/json' });
}
