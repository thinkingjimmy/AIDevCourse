/**
 * [INPUT]: A running isolated production build and installed Playwright Chromium.
 * [OUTPUT]: Reproducible mobile Lighthouse medians, requests, and gzip index sizes.
 * [POS]: Local acceptance measurement; reports stay separate from public assets.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, arch, release } from 'node:os';
import { gzipSync } from 'node:zlib';
const origin = process.env.PERFORMANCE_URL || 'http://127.0.0.1:3200';
const repetitions = Number(process.env.PERFORMANCE_RUNS || 3);
const paths = process.env.PERFORMANCE_PATH ? [process.env.PERFORMANCE_PATH] : ['zh', 'ja'].flatMap((lang) => [
  `/${lang}`, `/${lang}/courses/ai-101`, `/${lang}/courses/ai-101/models/strengths`,
]);
const directory = 'docs/evidence/performance';
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({ args: ['--remote-debugging-port=9222'] });
const report = {
  measuredAt: new Date().toISOString(), origin, build: 'isolated nonpublic production fixture',
  environment: { os: `${platform()} ${release()} ${arch()}`, cpu: cpus()[0].model, node: process.version, browser: browser.version() },
  methodology: 'Sequential cold navigations; Lighthouse default simulated mobile throttling; median of three runs. Local results are not field Core Web Vitals.',
  searchIndexes: [], pages: [],
};
const save = () => {
  const fullReport = repetitions === 3 && !process.env.PERFORMANCE_PATH;
  const pages = report.pages.map(({ runs, ...page }) => {
    const parts = page.path.split('/').filter(Boolean);
    const evidenceFile = `${parts[0]}-${parts.length === 1 ? 'home' : parts.length === 3 ? 'overview' : 'lesson'}-runs.json`;
    if (fullReport) writeFileSync(`${directory}/${evidenceFile}`, `${JSON.stringify({ path: page.path, runs }, null, 2)}\n`);
    return { ...page, evidenceFile: fullReport ? evidenceFile : undefined, runs: runs.map(({ requests, ...run }) => ({ ...run, requestCount: requests.length, transferBytes: requests.reduce((sum, request) => sum + (request.transferSize || 0), 0), initialSearchRequests: requests.filter((request) => request.path.startsWith('/api/search/')).map((request) => request.path) })) };
  });
  writeFileSync(`${directory}/${fullReport ? 'report' : 'diagnostic'}.json`, `${JSON.stringify({ ...report, pages }, null, 2)}\n`);
};
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
try {
  for (const lang of ['en', 'zh', 'ja', 'fr', 'es']) {
    const response = await fetch(`${origin}/api/search/${lang}`);
    if (!response.ok) throw new Error(`Index ${lang}: HTTP ${response.status}`);
    const body = Buffer.from(await response.arrayBuffer());
    report.searchIndexes.push({ lang, bytes: body.length, gzipBytes: gzipSync(body).length });
  }
  for (const path of paths) {
    const runs = [];
    for (let run = 1; run <= repetitions; run++) {
      const result = await lighthouse(`${origin}${path}`, { port: 9222, logLevel: 'error', onlyCategories: ['performance'], output: 'json' });
      if (!result || result.lhr.runtimeError) throw new Error(JSON.stringify(result?.lhr.runtimeError));
      const { lhr } = result;
      report.lighthouseVersion = lhr.lighthouseVersion;
      report.settings = lhr.configSettings;
      const requests = (lhr.audits['network-requests'].details?.items ?? []).map(({ url, transferSize, resourceType }) => ({ path: new URL(url).pathname, transferSize, resourceType }));
      const metrics = { performance: Math.round(lhr.categories.performance.score * 100), lcpMs: lhr.audits['largest-contentful-paint'].numericValue, fcpMs: lhr.audits['first-contentful-paint'].numericValue, cls: lhr.audits['cumulative-layout-shift'].numericValue, tbtMs: lhr.audits['total-blocking-time'].numericValue };
      runs.push({ run, ...metrics, requests, warnings: lhr.runWarnings });
      console.log(`${path} ${run}/${repetitions}: ${metrics.performance}, LCP ${Math.round(metrics.lcpMs)}ms, CLS ${metrics.cls}`);
    }
    report.pages.push({ path, medianPerformance: median(runs.map((run) => run.performance)), medianLcpMs: median(runs.map((run) => run.lcpMs)), medianCls: median(runs.map((run) => run.cls)), runs });
    save();
  }
  if (report.pages.some((page) => page.medianPerformance < 90) || report.searchIndexes.some((index) => index.gzipBytes > 500 * 1024)) process.exitCode = 1;
} finally {
  save();
  await browser.close();
}
