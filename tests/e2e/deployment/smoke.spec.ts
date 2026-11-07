import { test, expect } from '@playwright/test';
import nextEnv from '@next/env';
import { readFileSync } from 'node:fs';
import type { Catalog } from '../../../src/lib/content/model';
import { locales } from '../../../src/lib/i18n/config';
import { localePath } from '../../../src/lib/i18n/routing';
import { resolveSiteEnvironment } from '../../../config/site-environment.mjs';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

test('published build serves its multilingual routes, compiled MDX, search, and deployment metadata', async ({ page, request }) => {
  test.skip(process.env.CONTENT_TEST === '1', 'Deployment smoke checks use the published catalog.');
  const environment = resolveSiteEnvironment();
  const catalog = JSON.parse(readFileSync('.source/catalog.json', 'utf8')) as Catalog;
  const routes: { path: string; status: number; canonical: string | null; robots: string | null }[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', error => consoleErrors.push(error.message));
  const lessons = ['en', 'zh'].map(locale => catalog.documents.find(document => document.locale === locale && document.data.kind === 'lesson')!);
  expect(lessons.every(Boolean)).toBe(true);
  for (const path of [...locales.map(locale => localePath(locale)), ...lessons.map(lesson => lesson.url)]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(canonical, path).toBeTruthy();
    expect(new URL(canonical!).href, path).toBe(new URL(path, environment.origin).href);
    const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll(elements => elements.map(element => (element as HTMLLinkElement).href));
    expect(alternates.every(href => new URL(href).origin === environment.origin), path).toBe(true);
    if (environment.indexable) {
      expect(response?.headers()['x-robots-tag']).toBeUndefined();
      expect(robots).toBe('index, follow');
    } else {
      expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
      expect(robots).toBe('noindex, nofollow');
    }
    expect(response?.headers()['x-content-type-options']).toBe('nosniff');
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await response?.text(), path).not.toContain('INTERNAL_FIXTURE_DO_NOT_PUBLISH');
    routes.push({ path, status: response!.status(), canonical, robots });
  }
  await expect(page.locator('article > .prose')).toBeVisible();
  for (const locale of locales) {
    const search = await request.get(`/api/search/${locale}`);
    expect(search.status()).toBe(200);
    expect(search.headers()['content-type']).toContain('application/json');
    const body = await search.text();
    expect(body).toContain(catalog.documents.find(document => document.locale === locale)!.url);
    expect(body).not.toContain('INTERNAL_FIXTURE_DO_NOT_PUBLISH');
  }
  const sitemapResponse = await request.get('/sitemap.xml');
  expect(sitemapResponse.status()).toBe(200);
  const sitemap = await sitemapResponse.text();
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  expect(locations.length).toBeGreaterThan(catalog.documents.length);
  expect(locations.every(location => new URL(location).origin === environment.origin)).toBe(true);
  expect(sitemap).not.toContain('INTERNAL_FIXTURE_DO_NOT_PUBLISH');
  const robotsResponse = await request.get('/robots.txt');
  expect(robotsResponse.status()).toBe(200);
  const robots = await robotsResponse.text();
  if (environment.indexable) expect(robots).toContain(`Sitemap: ${environment.origin}/sitemap.xml`);
  else expect(robots).toContain('Disallow: /');
  const alias = await request.get('/en/about?from=deployment-smoke', { maxRedirects: 0 });
  expect(alias.status()).toBe(308);
  expect(alias.headers().location).toContain('/about?from=deployment-smoke');
  expect((await request.get('/zh/courses/deployment-missing-course')).status()).toBe(404);
  expect(consoleErrors).toEqual([]);
  await test.info().attach('Deployment HTTP smoke evidence', {
    body: JSON.stringify({ environment, routes, searchLanguages: locales, sitemapEntries: locations.length, robots, consoleErrors }, null, 2),
    contentType: 'application/json',
  });
  await test.info().attach('Published MDX lesson', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
});
