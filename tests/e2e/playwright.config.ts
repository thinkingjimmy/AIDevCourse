/**
 * [INPUT]: Built applications, browser projects, CI, and the local VISUAL_TEST opt-in.
 * [OUTPUT]: Real-server interaction E2E plus optional local screenshot comparisons.
 * [POS]: Colocated E2E configuration; test content cannot deploy to Vercel.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { defineConfig, devices } from '@playwright/test';
const fixture = process.env.CONTENT_TEST === '1';
const localVisualTests = process.env.VISUAL_TEST === '1' && !process.env.CI;
const port = Number(process.env.E2E_PORT || 3310);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('E2E_PORT must be a valid unprivileged port');
export default defineConfig({
  testDir: '.', outputDir: '../../test-results',
  snapshotPathTemplate: '{testDir}/../../docs/evidence/screenshots/tailwind/{projectName}/{arg}{ext}',
  updateSnapshots: 'none',
  grepInvert: localVisualTests ? undefined : /appearance:/,
  fullyParallel: true, workers: 3, retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: '../../playwright-report', open: 'never' }]],
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: { command: `CONTENT_TEST=${fixture ? '1' : '0'} pnpm start --hostname 127.0.0.1 --port ${port}`, cwd: '../..', port, reuseExistingServer: false, timeout: 60000 },
});
