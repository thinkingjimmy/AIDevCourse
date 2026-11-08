import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('deployment preflight validates production, preview, and isolated fixture environments', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'The deployment CLI has no browser-specific behavior.');
  const workspace = mkdtempSync(join(tmpdir(), 'aidevcourse-deployment-'));
  const evidence: unknown[] = [];
  try {
    mkdirSync(join(workspace, 'scripts/deployment'), { recursive: true });
    mkdirSync(join(workspace, 'config'));
    for (const file of ['package.json', 'scripts/deployment/check.mjs', 'config/site-environment.mjs']) cpSync(file, join(workspace, file));
    symlinkSync(join(process.cwd(), 'node_modules'), join(workspace, 'node_modules'), 'dir');
    const environment = { ...process.env };
    for (const key of ['SITE_URL', 'VERCEL', 'VERCEL_ENV', 'VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'CONTENT_TEST', '__NEXT_PROCESSED_ENV']) delete environment[key];
    const production = { VERCEL: '1', VERCEL_ENV: 'production' };
    const preview = { VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_PROJECT_PRODUCTION_URL: 'www.aidevcourse.com' };
    const valid = [
      { name: 'local defaults', env: {}, origin: 'http://localhost:3000', indexable: false },
      { name: 'local ignores legacy origin', env: { SITE_URL: 'https://old-domain.vercel.app' }, origin: 'http://localhost:3000', indexable: false },
      { name: 'local isolated fixtures', env: { CONTENT_TEST: '1' }, origin: 'http://localhost:3000', indexable: false },
      { name: 'production custom domain without SITE_URL', env: { ...production, VERCEL_PROJECT_PRODUCTION_URL: 'www.aidevcourse.com', VERCEL_URL: 'deployment-check.vercel.app' }, origin: 'https://www.aidevcourse.com', indexable: true },
      { name: 'production default Vercel domain', env: { ...production, VERCEL_PROJECT_PRODUCTION_URL: 'deployment-check.vercel.app' }, origin: 'https://deployment-check.vercel.app', indexable: true },
      { name: 'production ignores legacy origin', env: { ...production, VERCEL_PROJECT_PRODUCTION_URL: 'www.aidevcourse.com', SITE_URL: 'https://old-domain.vercel.app' }, origin: 'https://www.aidevcourse.com', indexable: true },
      { name: 'preview uses deployment domain', env: { ...preview, VERCEL_URL: 'preview-check.vercel.app', SITE_URL: 'https://old-domain.vercel.app' }, origin: 'https://preview-check.vercel.app', indexable: false },
    ];
    const invalidDomains = [
      'not a domain', 'https://deployment-check.vercel.app', 'http://deployment-check.vercel.app',
      'localhost', '127.0.0.1', '[::1]', 'example.com', 'www.example.org', 'courses.example',
      'courses.local', 'courses.internal', 'courses.test', 'courses.invalid',
      'deployment-check.vercel.app/', 'deployment-check.vercel.app/lesson',
      'user:password@deployment-check.vercel.app', 'deployment-check.vercel.app?',
      'deployment-check.vercel.app#', 'deployment-check.vercel.app:443', 'deployment-check.vercel.app:8443',
      ' deployment-check.vercel.app', 'deployment-check.vercel.app ',
    ];
    const invalid = [
      { name: 'missing production origin', env: production },
      { name: 'production cannot use deployment URL', env: { ...production, VERCEL_URL: 'deployment-check.vercel.app' } },
      { name: 'production cannot use legacy origin', env: { ...production, SITE_URL: 'https://old-domain.vercel.app' } },
      ...invalidDomains.flatMap(domain => [
        { name: `invalid production domain: ${domain}`, env: { ...production, VERCEL_PROJECT_PRODUCTION_URL: domain } },
        { name: `invalid preview domain: ${domain}`, env: { ...preview, VERCEL_URL: domain } },
      ]),
      { name: 'preview missing system URL', env: preview },
      { name: 'fixtures with VERCEL indicator', env: { VERCEL: '1', CONTENT_TEST: '1' } },
      { name: 'fixtures with production indicator', env: { VERCEL_ENV: 'production', CONTENT_TEST: '1' } },
      { name: 'fixtures with preview indicator', env: { VERCEL_ENV: 'preview', CONTENT_TEST: '1' } },
      { name: 'fixtures with deployment URL', env: { VERCEL_URL: 'preview-check.vercel.app', CONTENT_TEST: '1' } },
      { name: 'fixtures with production URL', env: { VERCEL_PROJECT_PRODUCTION_URL: 'www.aidevcourse.com', CONTENT_TEST: '1' } },
      { name: 'wrong package manager', env: { npm_config_user_agent: 'pnpm/9.0.0' } },
    ];
    for (const item of [...valid, ...invalid]) {
      const result = spawnSync(process.execPath, [join(workspace, 'scripts/deployment/check.mjs')], {
        cwd: workspace, env: { ...environment, ...item.env }, encoding: 'utf8', timeout: 15000,
      });
      expect(result.error).toBeUndefined();
      const mode = 'CONTENT_TEST' in item.env && item.env.CONTENT_TEST === '1' ? 'fixtures' : 'public';
      const report = JSON.parse(readFileSync(join(workspace, `.artifacts/deployment/environment-${mode}.json`), 'utf8'));
      const output = `${result.stdout}${result.stderr}`;
      evidence.push({ name: item.name, status: result.status, report });
      expect(result.status === 0, `${item.name}\n${output}`).toBe('origin' in item);
      if ('origin' in item) expect(report).toMatchObject({ ok: true, origin: item.origin, indexable: item.indexable });
      else expect(report).toMatchObject({ ok: false, error: expect.any(String) });
      if (item.name.startsWith('fixtures with')) expect(output).toContain('Test content must never be deployed.');
    }
  } finally {
    await test.info().attach('Deployment environment evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    rmSync(workspace, { recursive: true, force: true });
  }
});
