import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { attachRequests, mockEmbeds, scriptURL } from './fixtures';

test.describe.configure({ mode: 'default' });
let workspace: string;
let server: ChildProcess;
let origin: string;
let output = '';
const lesson = '/zh/courses/ai-coding/about-this-course';
const examples = `
## Embedded sources

Read <JimmyNoteAnchor id="x-source">the original post</JimmyNoteAnchor>.

<JimmyNote anchor="x-source">
  <XEmbed url="https://x.com/API/status/133640144317198338" />
</JimmyNote>

Watch <JimmyNoteAnchor id="video-source">the video</JimmyNoteAnchor>.

<JimmyNote anchor="video-source">
  <YouTube url="https://youtu.be/M7lc1UVf-VE" />
</JimmyNote>

Read <JimmyNoteAnchor id="mixed-source">a personal observation</JimmyNoteAnchor>.

<JimmyNote anchor="mixed-source">
This source adds context to the lesson.

<XEmbed url="https://x.com/API/status/133640144317198338" />
</JimmyNote>
`;

test.beforeAll(async ({}, workerInfo) => {
  test.setTimeout(120000);
  const root = process.cwd();
  workspace = mkdtempSync(join(tmpdir(), 'aidevcourse-note-embeds-'));
  for (const directory of ['src', 'config', 'content', 'public']) cpSync(join(root, directory), join(workspace, directory), { recursive: true });
  for (const file of ['package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'next.config.mjs']) cpSync(join(root, file), join(workspace, file));
  symlinkSync(join(root, 'node_modules'), join(workspace, 'node_modules'), 'dir');
  const file = join(workspace, 'content/zh/ai-coding/about-this-course.mdx');
  const original = readFileSync(file, 'utf8');
  writeFileSync(file, `---${original.split('---')[1]}---\n${examples}`);
  const port = 4510 + workerInfo.workerIndex;
  origin = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: workspace, env: { ...process.env, CONTENT_TEST: '0', NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout!.on('data', chunk => { output = (output + chunk).slice(-64000); });
  server.stderr!.on('data', chunk => { output = (output + chunk).slice(-64000); });
  await expect.poll(async () => {
    if (server.exitCode !== null) throw new Error(output);
    return fetch(`${origin}${lesson}`).then(response => response.status).catch(() => 0);
  }, { timeout: 90000, message: 'Embed-only notes compile in an isolated development server' }).toBe(200);
});

test.afterAll(async () => {
  await test.info().attach('Note embed development server', { body: output, contentType: 'text/plain' });
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise<void>(resolve => {
      const deadline = setTimeout(() => { server.kill('SIGKILL'); resolve(); }, 5000);
      server.once('exit', () => { clearTimeout(deadline); resolve(); });
    });
  }
  if (workspace) rmSync(workspace, { recursive: true, force: true });
});

for (const scenario of [
  { name: 'desktop', width: 1536 },
  { name: 'mobile', width: 390 },
  { name: 'narrow', width: 320 },
]) {
  test(`embed-only notes omit the author and remain usable on ${scenario.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: scenario.width, height: 960 });
    const requests = await mockEmbeds(page);
    expect((await page.goto(`${origin}${lesson}`))?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    if (scenario.width < 1024) expect(requests).not.toContain(scriptURL);
    for (const [index, id] of ['x-source', 'video-source', 'mixed-source'].entries()) {
      const trigger = page.locator(`[data-note-trigger-for="${id}"]`);
      if (scenario.width < 1024) await trigger.click();
      const card = page.locator(`[data-component="jimmy-note"][id="jimmy-note-${id}"]`);
      await expect(card).toBeVisible();
      await expect(card).toHaveAccessibleDescription(`批注 ${index + 1}`);
      await expect(card.locator('[data-slot="note-signature"]')).toHaveCount(id === 'mixed-source' ? 1 : 0);
      await expect(card.locator('[data-slot="note-author-actions"]')).toHaveCount(id === 'mixed-source' ? 1 : 0);
      const surface = await card.evaluate(element => {
        const style = getComputedStyle(element);
        return { border: parseFloat(style.borderTopWidth), shadow: style.boxShadow, padding: style.padding, maxHeight: style.maxHeight };
      });
      if (id === 'mixed-source') {
        expect(surface.border).toBeGreaterThan(0);
        expect(surface.shadow).not.toBe('none');
      } else {
        expect(surface.border).toBe(0);
        expect(surface.shadow).toBe('none');
        expect(surface.padding).toBe('0px');
        if (scenario.width >= 1024) expect(surface.maxHeight).toBe('none');
      }
      const embed = card.locator('[data-embed]');
      await embed.scrollIntoViewIfNeeded();
      if (id !== 'video-source') await expect(embed).toHaveAttribute('data-state', 'ready');
      await expect(embed.locator('iframe')).toHaveCount(1);
      expect(await card.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      if (scenario.width >= 1024) {
        const connector = page.locator(`[data-note-connector="${id}"]`);
        await expect(connector).toHaveAttribute('d', /^M /);
        await expect(async () => {
          const connection = await connector.evaluate(element => {
            const path = element as SVGPathElement;
            const end = path.getPointAtLength(path.getTotalLength()).matrixTransform(path.getScreenCTM()!);
            const note = path.closest('[data-jimmy-note-card]')!.querySelector('[data-component="jimmy-note"]')!;
            const bounds = note.getBoundingClientRect();
            return { stroke: parseFloat(getComputedStyle(path).strokeWidth), endX: end.x, left: bounds.left, border: parseFloat(getComputedStyle(note).borderLeftWidth) };
          });
          expect(connection.stroke).toBeGreaterThan(0);
          expect(Math.abs(connection.endX - connection.left - connection.border / 2)).toBeLessThan(1);
          if (id === 'mixed-source') expect(connection.stroke).toBe(connection.border);
        }).toPass({ timeout: 5000 });
      }
      const accessibility = await new AxeBuilder({ page }).include(`#jimmy-note-${id}`).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await test.info().attach(`${id}-${scenario.name}`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
      if (scenario.width < 1024) {
        const close = page.getByRole('button', { name: '关闭', exact: true });
        const closeBox = (await close.boundingBox())!;
        const frameBox = (await embed.locator('iframe').boundingBox())!;
        expect(closeBox.y + closeBox.height).toBeLessThanOrEqual(frameBox.y);
        if (id !== 'mixed-source') {
          const target = await close.evaluate(element => {
            const bounds = element.getBoundingClientRect();
            const before = getComputedStyle(element, '::before');
            return { height: bounds.height - parseFloat(before.top) - parseFloat(before.bottom), bottom: bounds.bottom - parseFloat(before.bottom) };
          });
          expect(target.height).toBeGreaterThanOrEqual(44);
          expect(target.bottom).toBeLessThanOrEqual((await card.boundingBox())!.y);
          if (id === 'x-source') {
            await embed.locator('iframe').evaluate(element => { element.style.height = '900px'; });
            await expect.poll(() => card.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
            await card.evaluate(element => { element.scrollTop = element.scrollHeight; });
            await expect(close).toBeInViewport();
            expect((await close.boundingBox())!.y + closeBox.height).toBeLessThanOrEqual((await card.boundingBox())!.y);
          }
        }
        await close.click();
        await expect(card).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await trigger.press('Enter');
        await expect(card).toBeVisible();
        if (id !== 'video-source') await expect(embed).toHaveAttribute('data-state', 'ready');
        await expect(embed.locator('iframe')).toHaveCount(1);
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
      }
    }
    expect(requests.filter(url => url === scriptURL)).toHaveLength(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await attachRequests(requests);
  });
}

test('an unavailable embed-only note keeps its source link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockEmbeds(page, { widget: 'reject' });
  await page.goto(`${origin}${lesson}`);
  await page.locator('[data-note-trigger-for="x-source"]').click();
  const card = page.locator('#jimmy-note-x-source');
  await expect(card.locator('[data-embed="x"]')).toHaveAttribute('data-state', 'unavailable');
  await expect(card.getByRole('link', { name: '在 X 上查看' })).toHaveAttribute('href', 'https://x.com/i/status/133640144317198338');
  await expect(card.locator('[data-slot="note-signature"]')).toHaveCount(0);
  await test.info().attach('Unavailable embed-only note', { body: await page.screenshot(), contentType: 'image/png' });
});

test('embed-only source notes remain readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    const requests = await mockEmbeds(page);
    expect((await page.goto(`${origin}${lesson}`))?.status()).toBe(200);
    const post = page.locator('#jimmy-note-x-source');
    await expect(post.getByRole('link', { name: '在 X 上查看' })).toBeVisible();
    await expect(post.locator('[data-slot="note-signature"]')).toHaveCount(0);
    await expect(post).toHaveAccessibleDescription('批注 1');
    await expect(page.locator('#jimmy-note-video-source').getByRole('link', { name: '在 YouTube 上观看' })).toBeVisible();
    expect(requests).not.toContain(scriptURL);
    await post.scrollIntoViewIfNeeded();
    await test.info().attach('Embed-only note without JavaScript', { body: await page.screenshot(), contentType: 'image/png' });
  } finally { await context.close(); }
});

test('editing an embed-only note updates its author header without a server restart', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1536, height: 960 });
  await mockEmbeds(page);
  await page.goto(`${origin}${lesson}`);
  const card = page.locator('#jimmy-note-x-source');
  const header = card.locator('[data-slot="note-signature"]');
  await expect(card).toBeVisible();
  await expect(header).toHaveCount(0);
  const file = join(workspace, 'content/zh/ai-coding/about-this-course.mdx');
  const original = readFileSync(file, 'utf8');
  try {
    writeFileSync(file, original.replace('  <XEmbed', 'A personal observation.\n\n  <XEmbed'));
    await expect(header).toBeVisible({ timeout: 30000 });
    await expect(card).toContainText('A personal observation.');
  } finally { writeFileSync(file, original); }
  await expect(header).toHaveCount(0, { timeout: 30000 });
  await expect(card.locator('[data-embed="x"]')).toHaveAttribute('data-state', 'ready');
  await test.info().attach('Embed-only note after hot reload', { body: await card.screenshot(), contentType: 'image/png' });
});
