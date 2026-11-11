import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url));
const development = process.env.E2E_DEV === '1';
const mode = process.env.CONTENT_TEST === '1' ? 'fixtures' : 'public';
const artifacts = join(root, '.artifacts/e2e', development ? `dev-${mode}` : mode);
const fixture = process.env.CONTENT_TEST === '1';
const localVisualTests = process.env.VISUAL_TEST === '1' && !process.env.CI;
const port = Number(process.env.E2E_PORT || 3310);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('E2E_PORT must be a valid unprivileged port');
export default defineConfig({
  expect: { timeout: development ? 15000 : 5000 },
  testDir: './e2e', outputDir: join(artifacts, 'results'),
  snapshotPathTemplate: join(root, '.artifacts/visual/{projectName}/{arg}{ext}'),
  updateSnapshots: 'none',
  grepInvert: localVisualTests ? undefined : /appearance:/,
  fullyParallel: true, workers: 3, retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: join(artifacts, 'report'), open: 'never' }], ['json', { outputFile: join(artifacts, 'results.json') }]],
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: { command: `pnpm ${development ? 'dev' : 'start'} --hostname 127.0.0.1 --port ${port}`, env: { CONTENT_TEST: fixture ? '1' : '0' }, cwd: root, port, reuseExistingServer: false, timeout: development ? 120000 : 60000, stdout: development ? 'pipe' : 'ignore' },
});
