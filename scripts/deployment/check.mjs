import nextEnv from '@next/env';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSiteEnvironment } from '../../config/site-environment.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
nextEnv.loadEnvConfig(root, false, { info() {}, error: console.error });
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const fixture = process.env.CONTENT_TEST === '1';
const report = {
  ok: false,
  node: process.version,
  packageManager: process.env.npm_config_user_agent?.split(' ')[0] ?? null,
  environment: process.env.VERCEL_ENV || 'local',
  content: fixture ? 'fixtures' : 'public',
  origin: null,
  indexable: false,
};

try {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Use Node.js 24.x for development, CI, and Vercel.');
  const expected = manifest.packageManager.replace('@', '/');
  if (report.packageManager !== expected) throw new Error(`Run this check through ${manifest.packageManager}.`);
  Object.assign(report, resolveSiteEnvironment());
  report.ok = true;
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
  console.error(report.error);
  process.exitCode = 1;
}

const artifacts = join(root, '.artifacts/deployment');
mkdirSync(artifacts, { recursive: true });
writeFileSync(join(artifacts, `environment-${fixture ? 'fixtures' : 'public'}.json`), `${JSON.stringify(report, null, 2)}\n`);
if (report.ok) console.log(`Deployment check passed: ${report.environment}, ${report.origin}, ${report.content} content.`);
