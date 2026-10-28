/**
 * [INPUT]: Production routes, isolated authoring workspaces, and the real content CLI.
 * [OUTPUT]: Unified localized 404 status, Geist Pixel and homepage-action parity with screenshots/JSON, recovery, authoring, deployment-guard, and search-race evidence.
 * [POS]: Scoped repository integration checks; temporary content never enters a deployment.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { locales, htmlLanguages } from '../../src/lib/i18n/config';
import { localePath } from '../../src/lib/i18n/routing';
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

for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`missing pages share one design and homepage Hero actions on ${viewport.name}`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const appearance = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      return { border: style.border, radius: style.borderRadius, background: style.backgroundColor, color: style.color, shadow: style.boxShadow, height: style.height, font: style.font, padding: style.padding, outline: style.outline, outlineOffset: style.outlineOffset };
    };
    const evidence = [];
    for (const locale of locales) {
      const copy = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
      await page.context().clearCookies();
      await page.goto(localePath(locale));
      const heroAction = page.locator('main a[data-variant="action-raised"]').first();
      await heroAction.focus();
      const homeFocus = await heroAction.evaluate(appearance);
      await heroAction.blur();
      await page.mouse.move(0, 0);
      const homeDefault = await heroAction.evaluate(appearance);
      await heroAction.hover();
      const homeHover = await heroAction.evaluate(appearance);
      let markup = '';
      const courseSlug = process.env.CONTENT_TEST === '1' ? 'ai-coding' : 'llm-101';
      for (const suffix of ['/unknown-page', '/courses/missing/lesson', `/courses/${courseSlug}/missing-lesson`]) {
        const path = localePath(locale, suffix);
        expect((await page.goto(path))?.status(), path).toBe(404);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('html')).toHaveAttribute('lang', htmlLanguages[locale]);
        await expect(page.locator('main')).toHaveCount(1);
        await expect(page.getByRole('banner')).toHaveCount(1);
        await expect(page.getByRole('contentinfo')).toHaveCount(1);
        const title = page.getByRole('heading', { level: 1 });
        await expect(title).toHaveText(copy.Ui.notFoundTitle);
        await expect(title).toHaveCSS('font-family', /Geist Pixel/);
        await expect(title).toHaveCSS('font-weight', '400');
        const numeral = page.locator('main > p[aria-hidden="true"]');
        await expect(numeral).toHaveText('404');
        await expect(numeral).toHaveCSS('font-family', /Geist Pixel/);
        const currentMarkup = await page.locator('main').innerHTML();
        if (markup) expect(currentMarkup).toBe(markup);
        markup = currentMarkup;
        const actions = page.locator('main a[data-slot="button"]');
        await expect(actions).toHaveCount(2);
        await page.mouse.move(0, 0);
        for (const action of await actions.all()) {
          await expect(action).toHaveAttribute('data-variant', 'action-raised');
          expect(await action.evaluate(appearance)).toEqual(homeDefault);
          await action.hover();
          expect(await action.evaluate(appearance)).toEqual(homeHover);
          await page.mouse.move(0, 0);
          await action.focus();
          expect(await action.evaluate(appearance)).toEqual(homeFocus);
          await expect(action).toBeFocused();
          await action.blur();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        evidence.push({ path, status: 404, title: await title.textContent(), button: await actions.first().evaluate(appearance) });
      }
      const links = await page.locator('main a[href^="/"]').evaluateAll((items) => items.map((item) => item.getAttribute('href')!));
      await page.locator('.language-picker summary').click();
      links.push(...await page.locator('.language-options a').evaluateAll((items) => items.map((item) => item.getAttribute('href')!)));
      for (const url of new Set(links)) expect((await request.get(url)).status(), url).toBe(200);
      await page.keyboard.press('Escape');
      // The pale numeral repeats the readable 404 label and is decorative.
      const accessibility = await new AxeBuilder({ page }).exclude('main > p[aria-hidden="true"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await test.info().attach(`404-${locale}-${viewport.name}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
    expect((await page.goto('/de/unknown-page'))?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toHaveText('Page not found');
    await test.info().attach('404 route and button evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  });
}

test('missing page stays unified without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    expect((await page.goto('/zh/courses/missing/lesson'))?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('页面未找到');
    await expect(page.locator('h1')).toHaveCSS('font-family', /Geist Pixel/);
    const home = page.getByRole('link', { name: '返回首页', exact: true });
    await expect(home).toHaveAttribute('data-variant', 'action-raised');
    await test.info().attach('404-mobile-no-js', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    await home.click();
    await expect(page).toHaveURL(/\/zh$/);
  } finally { await context.close(); }
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
