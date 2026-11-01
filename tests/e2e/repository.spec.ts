import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { locales, htmlLanguages } from '../../src/lib/i18n/config';
import { localePath } from '../../src/lib/i18n/routing';
import type { Catalog } from '../../src/lib/content/model';
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
  test(`runtime errors reuse the complete 404 page on ${viewport.name}`, async ({ page, request }) => {
    test.setTimeout(120000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const evidence = [];
    const catalog = JSON.parse(readFileSync(`${process.env.CONTENT_TEST === '1' ? '.source-test' : '.source'}/catalog.json`, 'utf8')) as Catalog;
    for (const locale of locales) {
      const copy = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
      await page.goto(localePath(locale, '/unknown-page'));
      const reference = await page.locator('main').innerHTML();
      const lessonPath = catalog.courses.find((course) => course.locale === locale)?.lessons[0]?.url;
      for (const path of [localePath(locale), localePath(locale, '/about'), ...(lessonPath ? [lessonPath] : [])]) {
        await page.context().clearCookies();
        const response = await page.goto(path);
        expect(response?.status(), path).toBe(200);
        await expect.poll(() => page.locator('main').evaluate((element) => Object.keys(element).some((name) => name.startsWith('__reactFiber')))).toBe(true);
        const injected = await page.locator('main').evaluate((element) => {
          type Fiber = { return?: Fiber; memoizedProps?: { errorComponent?: unknown }; stateNode?: { setState(state: { error: Error }): void } };
          const key = Object.keys(element).find((name) => name.startsWith('__reactFiber'));
          if (!key) return false;
          let fiber: Fiber | undefined = (element as unknown as Record<string, Fiber>)[key];
          for (; fiber; fiber = fiber.return) {
            if (fiber.memoizedProps?.errorComponent && fiber.stateNode?.setState) {
              fiber.stateNode.setState({ error: new Error('Controlled runtime recovery check') });
              return true;
            }
          }
          return false;
        });
        expect(injected, path).toBe(true);
        await expect(page.locator('h1')).toHaveText(copy.Ui.notFoundTitle);
        await expect(page.getByRole('banner')).toHaveCount(1);
        await expect(page.getByRole('contentinfo')).toHaveCount(1);
        await expect(page.locator('main')).toHaveCount(1);
        expect(await page.locator('main').innerHTML()).toBe(reference);
        await expect(page.locator('main button')).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        for (const href of await page.locator('main a').evaluateAll((links) => links.map((link) => link.getAttribute('href')!))) {
          expect((await request.get(href)).status(), href).toBe(200);
        }
        if (path === lessonPath) {
          await page.evaluate(() => document.fonts.ready);
          await test.info().attach(`runtime-404-${locale}-${viewport.name}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
        }
        evidence.push({ path, originalStatus: response?.status(), title: await page.locator('h1').innerText(), matches404: true });
        await page.getByRole('link', { name: copy.Ui.backHome, exact: true }).click();
        await expect(page.locator('h1')).toHaveText(copy.Home.title);
      }
    }
    await test.info().attach('Runtime 404 recovery evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  });

  test(`missing pages share one design and consistent action geometry on ${viewport.name}`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const appearance = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      return { borderWidth: style.borderWidth, borderStyle: style.borderStyle, radius: style.borderRadius, shadow: style.boxShadow, height: style.height, font: style.font, padding: style.padding, outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle, outlineOffset: style.outlineOffset };
    };
    const evidence = [];
    for (const locale of locales) {
      const copy = JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'));
      await page.context().clearCookies();
      let sharedDefault: ReturnType<typeof appearance> | undefined;
      let sharedHover: ReturnType<typeof appearance> | undefined;
      let sharedFocus: ReturnType<typeof appearance> | undefined;
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
          await expect(action).toHaveCSS('background-color', 'rgb(255, 255, 255)');
          sharedDefault ??= await action.evaluate(appearance);
          expect(await action.evaluate(appearance)).toEqual(sharedDefault);
          await action.hover();
          sharedHover ??= await action.evaluate(appearance);
          expect(await action.evaluate(appearance)).toEqual(sharedHover);
          await page.mouse.move(0, 0);
          await action.focus();
          sharedFocus ??= await action.evaluate(appearance);
          expect(await action.evaluate(appearance)).toEqual(sharedFocus);
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
