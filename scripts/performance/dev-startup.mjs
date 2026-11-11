import { spawn, execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { cpus, platform, release, arch } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../..', import.meta.url));
const source = resolve(process.env.STARTUP_SOURCE || root);
const repetitions = Number(process.env.STARTUP_RUNS || 3);
if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 10) throw new Error('STARTUP_RUNS must be an integer from 1 to 10');
const label = process.env.STARTUP_LABEL || 'current';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('STARTUP_LABEL must contain lowercase letters, numbers, or hyphens');
const idleMs = Number(process.env.STARTUP_IDLE_MS || 5000);
if (!Number.isInteger(idleMs) || idleMs < 1000 || idleMs > 60000) throw new Error('STARTUP_IDLE_MS must be an integer from 1000 to 60000');
const artifacts = join(root, '.artifacts/performance/dev-startup');
mkdirSync(artifacts, { recursive: true });
const directory = mkdtempSync(join(artifacts, `${label}-`));
const workspace = mkdtempSync(join(root, 'dev-profile-'));
for (const name of ['src', 'config', 'content', 'public']) cpSync(join(source, name), join(workspace, name), { recursive: true });
for (const name of ['package.json', 'pnpm-lock.yaml', 'tsconfig.json', '.gitignore']) cpSync(join(source, name), join(workspace, name));
cpSync(join(source, 'next.config.mjs'), join(workspace, 'next.startup.mjs'));
// A previous benchmark workspace already has a small configuration wrapper.
if (readFileSync(join(workspace, 'next.startup.mjs'), 'utf8').includes("from './next.startup.mjs'")) {
  cpSync(join(source, 'next.startup.mjs'), join(workspace, 'next.startup.mjs'));
}
symlinkSync(join(root, 'node_modules'), join(workspace, 'node_modules'), 'dir');
// The isolated copy shares installed dependencies, so Turbopack must resolve within their common root.
writeFileSync(join(workspace, 'next.config.mjs'), `import config from './next.startup.mjs';\nexport default { ...config, turbopack: { ...config.turbopack, root: ${JSON.stringify(root)} } };\n`);

const packageJson = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));
const report = {
  measuredAt: new Date().toISOString(), label, source, workspace, command: 'pnpm dev', script: packageJson.scripts.dev,
  methodology: `Sequential isolated sessions on the same port: an empty framework cache, then restarts with the same cache. Each session idles for ${idleMs}ms before shutdown to allow cache persistence. Readiness includes pnpm overhead. Requests read the full HTML response. Memory is the sum of RSS for pnpm and its descendants, sampled every second; shared pages can be counted more than once. The active dev server and its cache are not changed.`,
  environment: { os: `${platform()} ${release()} ${arch()}`, cpu: cpus()[0]?.model, node: process.version,
    pnpm: execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim(), next: packageJson.dependencies.next },
  runs: [],
};
const save = () => writeFileSync(join(directory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
save();

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

let active;
let interrupted = false;
const interrupt = () => { interrupted = true; active?.kill('SIGINT'); };
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);

async function measure(run, port) {
  const logPath = join(directory, `session-${run}.log`);
  const started = performance.now();
  const child = spawn('pnpm', ['dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: workspace, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CONTENT_TEST: '0', NEXT_TELEMETRY_DISABLED: '1', BROWSER: 'none' },
  });
  let log = '';
  let exited = false;
  const exit = new Promise(resolve => child.once('exit', () => { exited = true; resolve(); }));
  const kill = signal => {
    if (exited) return;
    try { if (process.platform === 'win32') child.kill(signal); else process.kill(-child.pid, signal); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  active = { kill };
  const entry = { session: run, cache: run === 1 ? 'cold' : 'warm', requests: [] };
  const memory = { peakRssBytes: 0, samples: [] };
  entry.memory = memory;
  const sample = () => {
    try {
      const rows = execFileSync('ps', ['-axo', 'pid=,ppid=,rss=,comm='], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
        .trim().split('\n').map(line => {
          const [, pid, parent, rss, command] = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/) ?? [];
          return { pid: Number(pid), parent: Number(parent), rssBytes: Number(rss) * 1024, command: basename(command || '') };
        });
      const pids = new Set([child.pid]);
      for (let size = 0; size !== pids.size;) {
        size = pids.size;
        for (const row of rows) if (pids.has(row.parent)) pids.add(row.pid);
      }
      const processes = rows.filter(row => pids.has(row.pid));
      const snapshot = { elapsedMs: Math.round(performance.now() - started), rssBytes: processes.reduce((sum, row) => sum + row.rssBytes, 0), processes };
      memory.samples.push(snapshot);
      memory.peakRssBytes = Math.max(memory.peakRssBytes, snapshot.rssBytes);
      return snapshot.rssBytes;
    } catch (error) { memory.error = String(error); }
  };
  const sampling = setInterval(sample, 1000);
  report.runs.push(entry);
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Development server did not become ready within 120 seconds')), 120000);
      const data = chunk => {
        log += chunk.toString();
        writeFileSync(logPath, log);
        if (!entry.readyMs && /Ready in/.test(log)) {
          entry.readyMs = Math.round(performance.now() - started);
          clearTimeout(timeout);
          resolve();
        }
      };
      child.stdout.on('data', data);
      child.stderr.on('data', data);
      child.once('error', error => { clearTimeout(timeout); reject(error); });
      child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Development server exited with code ${code}; see ${logPath}`)); });
    });
    memory.readyRssBytes = sample();
    for (const path of ['/zh', '/zh', '/zh/courses/llm-101', '/zh/courses/llm-101/what-a-language-model-does']) {
      const requestStarted = performance.now();
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(120000), redirect: 'error' });
      const body = await response.text();
      const result = { path, status: response.status, ms: Math.round(performance.now() - requestStarted), bytes: Buffer.byteLength(body), rssBytes: sample() };
      entry.requests.push(result);
      console.log(`${entry.cache} ${run}/${repetitions}: ${path} HTTP ${result.status}, ${result.ms}ms`);
      if (!response.ok || !body.includes('</html>')) throw new Error(`Incomplete response for ${path}; see ${logPath}`);
    }
    entry.homeFromLaunchMs = entry.readyMs + entry.requests[0].ms;
    await delay(idleMs);
    memory.settledRssBytes = sample();
  } catch (error) {
    entry.error = String(error);
    throw error;
  } finally {
    clearInterval(sampling);
    kill('SIGINT');
    const timeout = setTimeout(() => kill('SIGKILL'), 10000);
    try { await exit; } finally { clearTimeout(timeout); active = undefined; save(); }
  }
}

try {
  const port = await availablePort();
  for (let run = 1; run <= repetitions; run++) {
    if (interrupted) throw new Error('Startup measurement interrupted');
    await measure(run, port);
    // Allow the previous process and filesystem cache writer to finish before a restart.
    if (run < repetitions) await delay(500);
  }
} catch (error) {
  report.error = String(error);
  process.exitCode = 1;
} finally {
  const savedWorkspace = join(directory, 'workspace');
  renameSync(workspace, savedWorkspace);
  report.measuredWorkspace = workspace;
  report.workspace = savedWorkspace;
  save();
  console.log(`Startup report: ${join(directory, 'report.json')}`);
}
