/**
 * [INPUT]: Production routes, isolated authoring workspaces, and the real content CLI.
 * [OUTPUT]: Recovery, authoring, deployment-guard, and search-race regression evidence.
 * [POS]: Scoped repository integration checks; temporary content never enters a deployment.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { test, expect } from '@playwright/test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('authoring CLI accepts only destinations rendered by the site', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'The CLI has no browser-specific behavior.');
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-authoring-'));
  try {
    cpSync('tests/fixtures', join(root, 'content'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'content/en/ai-coding/foundations/first-change.mdx');
    const body = readFileSync(file, 'utf8');
    const cases = [
      { url: '/en/courses', valid: false },
      { url: '/en/courses/ai-coding#a-small-change', valid: false },
      { url: '/en/courses/ai-coding#course-catalog', valid: true },
      { url: '/en/courses/ai-coding/first-change#a-small-change', valid: true },
      { url: '/en', valid: true },
    ];
    for (const { url, valid } of cases) {
      writeFileSync(file, `${body}\n[Destination](${url})\n`);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/check-content.ts')], {
        cwd: root, env: { ...process.env, CONTENT_TEST: '0' }, encoding: 'utf8', timeout: 15000,
      });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      await test.info().attach(`authoring-${cases.findIndex((item) => item.url === url)}`, { body: output, contentType: 'text/plain' });
      expect(result.error).toBeUndefined();
      expect(result.status === 0, `${url}\n${output}`).toBe(valid);
    }
    const deployment = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/check-content.ts')], {
      cwd: root, env: { ...process.env, CONTENT_TEST: '1', VERCEL: '1' }, encoding: 'utf8', timeout: 15000,
    });
    const output = `${deployment.stdout ?? ''}${deployment.stderr ?? ''}`;
    await test.info().attach('Fixture deployment guard', { body: output, contentType: 'text/plain' });
    expect(deployment.error).toBeUndefined();
    expect(deployment.status).not.toBe(0);
    expect(output).toContain('Test content must never be deployed.');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('missing pages offer working recovery and language links', async ({ page, request }) => {
  for (const path of ['/unknown-page', '/en/unknown-page', '/zh/courses/missing/lesson']) {
    expect((await page.goto(path))?.status()).toBe(404);
    const links = await page.locator('main a[href^="/"]').evaluateAll((items) => items.map((item) => item.getAttribute('href')!));
    expect(links.length).toBeGreaterThan(0);
    await page.locator('.language-picker summary').click();
    links.push(...await page.locator('.language-options a').evaluateAll((items) => items.map((item) => item.getAttribute('href')!)));
    for (const url of new Set(links)) expect((await request.get(url)).status(), `${path} → ${url}`).toBe(200);
  }
  const path = test.info().outputPath('recovery-links.png');
  await page.screenshot({ path });
  await test.info().attach('Missing page recovery', { path, contentType: 'image/png' });
});

test('search does not activate an old result while a new query is pending', async ({ page }) => {
  test.skip(process.env.CONTENT_TEST !== '1', 'Search results require the isolated lessons.');
  await page.goto('/en');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Control+k');
  const input = page.getByRole('textbox', { name: 'Search lessons' });
  await input.fill('context');
  await expect(page.locator('.search-result').first()).toBeVisible();
  await input.fill('no-matching-lesson-94732');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.search-result')).toHaveCount(0);
  const path = test.info().outputPath('search-current-query.png');
  await page.screenshot({ path });
  await test.info().attach('Search query isolation', { path, contentType: 'image/png' });
});
