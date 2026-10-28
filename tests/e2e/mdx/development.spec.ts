/**
 * [INPUT]: The configured development command, an isolated application copy, real CSS edits, and Chromium navigation.
 * [OUTPUT]: Evidence against missing CSS chunks, stale HMR styles, full reloads, browser rejections, and leaked development processes.
 * [POS]: Development-only regression check that leaves the user's running server and source files untouched.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('development CSS refresh and page navigation keep stylesheet chunks loaded', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium' || process.env.CONTENT_TEST === '1', 'The development bundler check runs once against published content.');
  test.setTimeout(120000);
  const root = process.cwd();
  const workspace = mkdtempSync(join(tmpdir(), 'aidevcourse-css-hmr-'));
  const port = await new Promise<number>((resolve, reject) => {
    const reservation = createServer();
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', () => {
      const address = reservation.address();
      if (!address || typeof address === 'string') { reservation.close(); reject(new Error('No development port')); return; }
      reservation.close(() => resolve(address.port));
    });
  });
  let output = '';
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  for (const directory of ['src', 'config', 'content', 'public']) cpSync(join(root, directory), join(workspace, directory), { recursive: true });
  for (const file of ['package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'next.config.mjs']) cpSync(join(root, file), join(workspace, file));
  symlinkSync(join(root, 'node_modules'), join(workspace, 'node_modules'), 'dir');
  const command = JSON.parse(readFileSync(join(workspace, 'package.json'), 'utf8')).scripts.dev as string;
  expect(command).toBe('next dev --webpack');
  const server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), ...command.split(' ').slice(1), '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: workspace, env: { ...process.env, CONTENT_TEST: '0', NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => { output = (output + chunk).slice(-64000); });
  server.stderr.on('data', (chunk) => { output = (output + chunk).slice(-64000); });
  const origin = `http://127.0.0.1:${port}`;
  try {
    await expect.poll(async () => {
      if (server.exitCode !== null) throw new Error(output);
      return fetch(`${origin}/zh`).then((response) => response.status).catch(() => 0);
    }, { timeout: 60000, message: 'The isolated Webpack development server starts' }).toBe(200);
    await page.goto(`${origin}/zh`);
    await page.getByRole('link', { name: '马上学习', exact: true }).click();
    await expect(page).toHaveURL(/\/zh\/courses\/llm-101\/what-a-language-model-does$/);
    await page.getByRole('link', { name: /^什么是 Token[?？]$/ }).first().click();
    await expect(page).toHaveURL(/\/what-is-a-token$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^什么是 Token[?？]$/);
    await page.evaluate(() => { (window as Window & { hmrWitness?: string }).hmrWitness = 'preserved'; });
    appendFileSync(join(workspace, 'src/styles/prose.css'), '\n@layer base { body { --hmr-regression: updated; } }\n');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--hmr-regression').trim()), { timeout: 30000 }).toBe('updated');
    expect(await page.evaluate(() => (window as Window & { hmrWitness?: string }).hmrWitness)).toBe('preserved');
    const stylesheets = await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
    expect(stylesheets.length).toBeGreaterThan(0);
    for (const href of stylesheets) expect((await page.request.get(href)).status()).toBe(200);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^什么是 Token[?？]$/);
    expect(errors).toEqual([]);
    const screenshot = test.info().outputPath('development-css-hmr.png');
    await page.screenshot({ path: screenshot, animations: 'disabled' });
    await test.info().attach('Development CSS after refresh', { path: screenshot, contentType: 'image/png' });
    await test.info().attach('Development CSS evidence', { body: JSON.stringify({ command, stylesheets, errors, cssUpdated: true, fullReloadDuringHmr: false }, null, 2), contentType: 'application/json' });
  } finally {
    await test.info().attach('Development server log', { body: output, contentType: 'text/plain' });
    if (server.exitCode === null) {
      server.kill('SIGTERM');
      await new Promise<void>((resolve) => {
        const deadline = setTimeout(() => { server.kill('SIGKILL'); resolve(); }, 5000);
        server.once('exit', () => { clearTimeout(deadline); resolve(); });
      });
    }
    rmSync(workspace, { recursive: true, force: true });
  }
});
