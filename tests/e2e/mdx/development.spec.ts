import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('development hydration tolerates extension attributes and preserves hot reload', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium' || process.env.CONTENT_TEST === '1', 'The development bundler check runs once against published content.');
  test.setTimeout(180000);
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
  let expectedMissingURL: string | undefined;
  const errors: string[] = [];
  const fontResponses: { url: string; status: number }[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const expected404 = message.location().url === expectedMissingURL && /status of 404/.test(message.text());
    if (message.type() === 'error' && !expected404) errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.request().resourceType() === 'font') fontResponses.push({ url: response.url(), status: response.status() });
  });
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
  await page.addInitScript(() => {
    const inject = () => {
      if (!document.documentElement) return false;
      document.documentElement.setAttribute('data-immersive-translate-page-theme', 'light');
      return true;
    };
    if (!inject()) {
      const observer = new MutationObserver(() => { if (inject()) observer.disconnect(); });
      observer.observe(document, { childList: true });
    }
  });
  try {
    await expect.poll(async () => {
      if (server.exitCode !== null) throw new Error(output);
      return fetch(`${origin}/zh`).then((response) => response.status).catch(() => 0);
    }, { timeout: 60000, message: 'The isolated Webpack development server starts' }).toBe(200);
    await page.goto(`${origin}/zh`);
    await expect(page.locator('html')).toHaveAttribute('data-immersive-translate-page-theme', 'light');
    await page.getByRole('link', { name: '马上学习', exact: true }).click();
    await expect(page).toHaveURL(/\/zh\/courses\/llm-101\/what-a-language-model-does$/);
    await page.locator('a[href="/zh/courses/llm-101/what-is-a-token"]').first().click();
    await expect(page).toHaveURL(/\/what-is-a-token$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('什么是 Token');
    await page.evaluate(() => { (window as Window & { hmrWitness?: string }).hmrWitness = 'preserved'; });
    appendFileSync(join(workspace, 'src/styles/prose.css'), '\n@layer base { body { --hmr-regression: updated; } }\n');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--hmr-regression').trim()), { timeout: 30000 }).toBe('updated');
    expect(await page.evaluate(() => (window as Window & { hmrWitness?: string }).hmrWitness)).toBe('preserved');
    const stylesheets = await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
    expect(stylesheets.length).toBeGreaterThan(0);
    for (const href of stylesheets) expect((await page.request.get(href)).status()).toBe(200);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('什么是 Token');
    await expect(page.locator('html')).toHaveAttribute('data-immersive-translate-page-theme', 'light');
    expect(errors).toEqual([]);
    const screenshot = test.info().outputPath('development-css-hmr.png');
    await page.screenshot({ path: screenshot, animations: 'disabled' });
    await test.info().attach('Development CSS after refresh', { path: screenshot, contentType: 'image/png' });
    await test.info().attach('Development CSS evidence', { body: JSON.stringify({ command, stylesheets, errors, cssUpdated: true, fullReloadDuringHmr: false }, null, 2), contentType: 'application/json' });

    const lessonPath = '/zh/courses/llm-101/what-a-language-model-does';
    const lessonFile = join(workspace, 'content/zh/llm-101/model-fundamentals/what-a-language-model-does.mdx');
    const original = readFileSync(lessonFile, 'utf8');
    const probe = `
<Achievement
  id="development-hot-reload"
  title="Live achievement"
  question="Which action adds useful context?"
  answer="context"
  explanation="Specific requirements give the model useful context."
  takeaway="Explain the context and requirements."
>
  <AchievementOption value="repeat">Repeat the vague request.</AchievementOption>
  <AchievementOption value="context">Add specific requirements.</AchievementOption>
</Achievement>
`;
    const card = page.locator('[data-achievement="development-hot-reload"]');
    expect((await page.goto(`${origin}${lessonPath}`))?.status()).toBe(200);
    await expect(card).toHaveCount(0);
    appendFileSync(lessonFile, probe);
    await expect.poll(async () => {
      const response = await page.request.get(`${origin}${lessonPath}`);
      return response.status() === 200 && (await response.text()).includes('Which action adds useful context?');
    }, { timeout: 30000 }).toBe(true);
    expect((await page.reload())?.status()).toBe(200);
    await expect(card.getByRole('radio')).toHaveCount(2);
    await card.getByRole('radio').first().click();
    await expect(card).toHaveAttribute('data-state', 'incorrect');
    await expect(card).toContainText('Specific requirements give the model useful context.');
    await card.getByRole('radio').nth(1).click();
    await expect(card).toHaveAttribute('data-state', 'unlocked');
    await expect(card.getByRole('heading')).toContainText('Live achievement');
    const storageKey = 'lac:v1:llm-101:achievement:development-hot-reload';
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), storageKey)).not.toBeNull();
    await page.reload();
    await expect(card).toHaveAttribute('data-state', 'unlocked');
    await test.info().attach('Hot-reloaded achievement', { body: await card.screenshot(), contentType: 'image/png' });

    writeFileSync(lessonFile, original + probe.replace('Live achievement', 'Updated achievement'));
    await expect(card.getByRole('heading')).toContainText('Updated achievement', { timeout: 30000 });
    writeFileSync(lessonFile, original);
    await expect(card).toHaveCount(0, { timeout: 30000 });
    expect((await page.reload())?.status()).toBe(200);
    await expect(card).toHaveCount(0);
    expect(errors).toEqual([]);
    await test.info().attach('Achievement hot reload evidence', { body: JSON.stringify({ addedWithoutRestart: true, incorrectFeedback: true, unlocked: true, persisted: true, titleUpdated: true, removedWithoutRestart: true, errors }, null, 2), contentType: 'application/json' });

    const fonts = [];
    for (const route of [
      { path: '/zh', status: 200, family: 'Noto Sans SC Variable' },
      { path: '/ja', status: 200, family: 'Noto Sans JP Variable' },
      { path: '/?lang=en', status: 200, family: 'Geist Variable' },
      { path: '/zh/courses/llm-101', status: 200, family: 'Noto Sans SC Variable' },
      { path: '/zh/courses/llm-101/how-language-models-are-trained', status: 200, family: 'Noto Sans SC Variable' },
      { path: '/design/components', status: 200, family: 'Geist Variable' },
      { path: '/zh/unknown-page', status: 404, family: 'Noto Sans SC Variable' },
      { path: '/xx/unknown-page', status: 404, family: 'Geist Variable' },
    ]) {
      expectedMissingURL = route.status === 404 ? `${origin}${route.path}` : undefined;
      expect((await page.goto(`${origin}${route.path}`))?.status()).toBe(route.status);
      await expect(page.locator('html')).toHaveAttribute('data-immersive-translate-page-theme', 'light');
      await page.evaluate(() => document.fonts.ready);
      const loaded = await page.evaluate(() => Array.from(document.fonts).filter((font) => font.status === 'loaded').map((font) => font.family.replaceAll('"', '')));
      expect(loaded, route.path).toContain(route.family);
      fonts.push({ ...route, loaded });
    }
    expect(fontResponses.length).toBeGreaterThan(0);
    for (const response of fontResponses) {
      expect(new URL(response.url).origin).toBe(origin);
      expect(new URL(response.url).pathname).toMatch(/\.woff2$/);
      expect(response.status).toBe(200);
    }
    expect(output).not.toMatch(/Client network socket disconnected|Retrying \d|webpack\.cache\.PackFileCacheStrategy/);
    expect(errors).toEqual([]);
    await test.info().attach('Extension hydration evidence', { body: JSON.stringify({ attribute: 'data-immersive-translate-page-theme', value: 'light', injectedBeforeHydration: true, routes: fonts.map(({ path }) => path), errors }, null, 2), contentType: 'application/json' });
    await test.info().attach('Local development fonts', { body: JSON.stringify({ node: process.version, fonts, fontResponses }, null, 2), contentType: 'application/json' });
    await test.info().attach('Local-font 404', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  } finally {
    await test.info().attach('Browser errors', { body: JSON.stringify(errors, null, 2), contentType: 'application/json' });
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
