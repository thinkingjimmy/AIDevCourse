/**
 * [INPUT]: A running production build, its sitemap, and installed Playwright Chromium.
 * [OUTPUT]: Mobile Lighthouse medians, request details, and gzip search sizes in .artifacts/performance.
 * [POS]: Optional local performance gate; discovers live URLs instead of assuming course slugs.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { cpus, platform, arch, release } from 'node:os';
import { gzipSync } from 'node:zlib';

const origin = new URL(process.env.PERFORMANCE_URL || 'http://127.0.0.1:3200').origin;
const repetitions = Number(process.env.PERFORMANCE_RUNS || 3);
if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 10) throw new Error('PERFORMANCE_RUNS must be an integer from 1 to 10');
const directory = '.artifacts/performance';
mkdirSync(directory, { recursive: true });
async function get(path) {
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new Error('Performance paths must stay on the configured origin');
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response;
}
const sitemap = await (await get('/sitemap.xml')).text();
const published = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
const paths = process.env.PERFORMANCE_PATH ? [process.env.PERFORMANCE_PATH] : ['zh', 'ja'].flatMap((lang) => {
  const course = published.find((path) => new RegExp(`^/${lang}/courses/[^/]+$`).test(path));
  const lesson = course && published.find((path) => path.startsWith(`${course}/`));
  return [`/${lang}`, course, lesson].filter(Boolean);
});
for (const path of paths) await get(path);
const port = await new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    server.close((error) => error ? reject(error) : resolve(port));
  });
});
const browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`] });
const report = {
  measuredAt: new Date().toISOString(), origin,
  environment: { os: `${platform()} ${release()} ${arch()}`, cpu: cpus()[0]?.model, node: process.version, browser: browser.version() },
  methodology: `Sequential cold navigations; Lighthouse default simulated mobile throttling; median of ${repetitions} runs. Local results are not field Core Web Vitals.`,
  searchIndexes: [], pages: [],
};
const save = () => writeFileSync(`${directory}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
try {
  for (const lang of ['en', 'zh', 'ja', 'fr', 'es']) {
    const body = Buffer.from(await (await get(`/api/search/${lang}`)).arrayBuffer());
    report.searchIndexes.push({ lang, bytes: body.length, gzipBytes: gzipSync(body).length });
  }
  for (const path of paths) {
    const runs = [];
    for (let run = 1; run <= repetitions; run++) {
      const result = await lighthouse(new URL(path, origin).href, { port, logLevel: 'error', onlyCategories: ['performance'], output: 'json' });
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
} catch (error) {
  report.error = String(error);
  throw error;
} finally {
  await browser.close();
  save();
}
