/**
 * [INPUT]: Production routes, isolated authoring workspaces, and the real content CLI.
 * [OUTPUT]: Recovery, minimal-metadata and declarative achievement authoring, removed-field rejection, deployment-guard, and search-race evidence.
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
      { url: '/courses', valid: false },
      { url: '/courses/ai-coding#a-small-change', valid: false },
      { url: '/courses/ai-coding#course-catalog', valid: true },
      { url: '/courses/ai-coding/first-change#a-small-change', valid: true },
      { url: '/', valid: true },
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

test('authoring CLI accepts minimal metadata and rejects removed fields', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'The CLI has no browser-specific behavior.');
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-metadata-'));
  try {
    cpSync('tests/fixtures', join(root, 'content'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'content/en/ai-coding/foundations/first-change.mdx');
    const body = readFileSync(file, 'utf8');
    const run = () => spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/check-content.ts')], {
      cwd: root, env: { ...process.env, CONTENT_TEST: '0' }, encoding: 'utf8', timeout: 15000,
    });
    const baseline = run();
    expect(baseline.error).toBeUndefined();
    expect(baseline.status, `${baseline.stdout}\n${baseline.stderr}`).toBe(0);
    const evidence = [{ field: 'minimal frontmatter', status: baseline.status, output: `${baseline.stdout}${baseline.stderr}` }];
    for (const field of ['kind: lesson', 'durationMinutes: 10', 'lessonType: concept', 'contentRevision: 1', 'translatedFromRevision: 1', 'lastVerified: 2026-10-01', 'testedWith: Local browser']) {
      writeFileSync(file, body.replace('---\n', `---\n${field}\n`));
      const result = run();
      expect(result.error).toBeUndefined();
      expect(result.status, field).not.toBe(0);
      const output = `${result.stdout}${result.stderr}`;
      expect(output).toContain(field.split(':')[0]);
      evidence.push({ field, status: result.status, output });
    }
    await test.info().attach('Minimal frontmatter CLI evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('achievement authoring CLI validates declarative questions and translations', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'The CLI has no browser-specific behavior.');
  test.setTimeout(120000);
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-achievement-authoring-'));
  try {
    cpSync('tests/fixtures', join(root, 'content'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const original = join(root, 'content/zh/ai-coding/foundations/first-change.mdx');
    const translated = join(root, 'content/en/ai-coding/foundations/first-change.mdx');
    const other = join(root, 'content/zh/ai-coding/foundations/verify-results.mdx');
    const overview = join(root, 'content/zh/ai-coding/index.mdx');
    const files = [original, translated, other, overview];
    const bodies = files.map((file) => readFileSync(file, 'utf8'));
    const challenge = `<Achievement id="authoring-check" title="Check the source" question="What should you do?" answer="verify" explanation="Check the source first." takeaway="Verify before acting.">
  <AchievementOption value="trust">Trust the output.</AchievementOption>
  <AchievementOption value="verify">Check the source.</AchievementOption>
</Achievement>`;
    // Cover invalid identities, missing data, ambiguous answers, unsafe syntax, ownership, and translation drift.
    const cases = [
      { name: 'valid declaration', valid: true, body: challenge },
      { name: 'two declarations in one article', valid: true, body: `${challenge}\n\n${challenge.replace('id="authoring-check"', 'id="another-check"')}` },
      { name: 'removed heading field', body: challenge.replace('id="authoring-check"', 'id="authoring-check" heading="Obsolete heading"') },
      { name: 'missing question', body: challenge.replace(' question="What should you do?"', '') },
      { name: 'empty title', body: challenge.replace('title="Check the source"', 'title=" "') },
      { name: 'invalid ID', body: challenge.replace('id="authoring-check"', 'id="Not stable"') },
      { name: 'duplicate option values', body: challenge.replace('value="trust"', 'value="verify"') },
      { name: 'missing correct option', body: challenge.replace('answer="verify"', 'answer="missing"') },
      { name: 'empty option', body: challenge.replace('Trust the output.', ' ') },
      { name: 'single option', body: challenge.replace('  <AchievementOption value="trust">Trust the output.</AchievementOption>', '') },
      { name: 'nested option markup', body: challenge.replace('Trust the output.', '**Trust** the output.') },
      { name: 'orphan option', body: '<AchievementOption value="verify">Verify.</AchievementOption>' },
      { name: 'extra content', body: challenge.replace('</Achievement>', 'Unexpected content\n</Achievement>') },
      { name: 'expression', body: challenge.replace('answer="verify"', 'answer={"verify"}') },
      { name: 'unsupported attribute', body: challenge.replace('id="authoring-check"', 'id="authoring-check" hidden="yes"') },
      { name: 'duplicate attribute', body: challenge.replace('id="authoring-check"', 'id="authoring-check" id="duplicate"') },
      { name: 'duplicate in article', body: `${challenge}\n\n${challenge}` },
      { name: 'duplicate across articles', body: challenge, target: other, extra: challenge },
      { name: 'course overview', body: '', target: overview, extra: challenge },
      { name: 'valid translation', valid: true, body: challenge, target: translated, extra: challenge.replace('What should you do?', 'Which action should you take?') },
      { name: 'unknown translated ID', body: challenge, target: translated, extra: challenge.replace('id="authoring-check"', 'id="different-id"') },
      { name: 'translated answer drift', body: challenge, target: translated, extra: challenge.replace('answer="verify"', 'answer="trust"') },
      { name: 'translated option drift', body: challenge, target: translated, extra: challenge.replace('value="trust"', 'value="guess"') },
    ];
    const evidence = [];
    for (const item of cases) {
      files.forEach((file, index) => writeFileSync(file, bodies[index]));
      writeFileSync(original, `${bodies[0]}\n${item.body}\n`);
      if (item.target) writeFileSync(item.target, `${readFileSync(item.target, 'utf8')}\n${item.extra}\n`);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/check-content.ts')], {
        cwd: root, env: { ...process.env, CONTENT_TEST: '0' }, encoding: 'utf8', timeout: 15000,
      });
      const output = `${result.stdout}${result.stderr}`;
      evidence.push({ name: item.name, status: result.status, output });
      expect(result.error).toBeUndefined();
      expect(result.status === 0, `${item.name}\n${output}`).toBe(item.valid ?? false);
    }
    await test.info().attach('Achievement authoring validation', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('missing pages offer working recovery and language links', async ({ page, request }) => {
  for (const path of ['/unknown-page', '/unknown-page', '/zh/courses/missing/lesson']) {
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
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Control+k');
  const input = page.getByRole('textbox', { name: 'Search lessons' });
  await input.fill('context');
  await expect(page.locator('.search-result').first()).toBeVisible();
  await input.fill('no-matching-lesson-94732');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.search-result')).toHaveCount(0);
  const path = test.info().outputPath('search-current-query.png');
  await page.screenshot({ path });
  await test.info().attach('Search query isolation', { path, contentType: 'image/png' });
});
