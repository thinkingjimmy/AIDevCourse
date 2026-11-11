import { test, expect } from '@playwright/test';
import { copyFileSync, existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

test.skip(process.env.E2E_DEV !== '1' || process.env.CONTENT_TEST !== '1', 'Requires the development server and the independent fixture catalog.');
test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);
const lesson = '/zh/courses/ai-coding/verify-results';
const file = join('tests/fixtures/zh/ai-coding/foundations/verify-results.mdx');

test('body edits refresh headings and achievement definitions without a restart', async ({ page }, testInfo) => {
  const original = readFileSync(file, 'utf8');
  try {
    await page.goto(lesson);
    await expect(page.locator('[data-achievement="verify-before-done"]')).toBeVisible();
    await page.waitForLoadState('networkidle');
    writeFileSync(file, original.replace('id="verify-before-done"', 'id="verify-cache-refresh"')
      .replace('title="Result verifier"', 'title="Updated result verifier"')
      .replace('question="What should you do before accepting a code change?"', 'question="What should you verify after a cache refresh?"')
      + '\n\n## Updated catalog heading\n\nUpdated development content.\n');
    await expect(page.locator('article h2#updated-catalog-heading')).toContainText('Updated catalog heading', { timeout: 30000 });
    await expect(page.locator('[data-achievement="verify-cache-refresh"] legend')).toHaveText('What should you verify after a cache refresh?');
    await expect(page.locator('[data-achievement="verify-before-done"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="lesson-toc"] a[href="#updated-catalog-heading"]')).toHaveCount(1);
    await testInfo.attach('Updated body and achievement', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    writeFileSync(file, original);
    await expect(page.locator('[data-achievement="verify-before-done"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('article h2#updated-catalog-heading')).toHaveCount(0);
    await testInfo.attach('Restored body and achievement', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  } finally { writeFileSync(file, original); }
});

test('asset removal invalidates a warm catalog and restoring it recovers the route', async ({ page, request }, testInfo) => {
  const original = readFileSync(file, 'utf8');
  const url = `/images/courses/dev-startup-${randomUUID()}.svg`;
  const image = join('public', url);
  const evidence: { stage: string; status: number }[] = [];
  try {
    copyFileSync('public/images/courses/change-cycle.svg', image);
    writeFileSync(file, `${original}\n\n![Development cache asset](${url})\n`);
    await page.goto(lesson);
    await expect(page.getByRole('img', { name: 'Development cache asset' })).toBeVisible();
    evidence.push({ stage: 'warm', status: (await request.get('/zh/courses/ai-coding')).status() });
    unlinkSync(image);
    await expect.poll(async () => {
      const response = await request.get('/zh/courses/ai-coding');
      evidence.push({ stage: 'missing asset', status: response.status() });
      return response.status();
    }, { timeout: 15000 }).toBe(500);
    copyFileSync('public/images/courses/change-cycle.svg', image);
    await expect.poll(async () => {
      const response = await request.get('/zh/courses/ai-coding');
      evidence.push({ stage: 'restored asset', status: response.status() });
      return response.status();
    }, { timeout: 15000 }).toBe(200);
  } finally {
    writeFileSync(file, original);
    if (existsSync(image)) unlinkSync(image);
    await testInfo.attach('Asset invalidation responses', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  }
});
