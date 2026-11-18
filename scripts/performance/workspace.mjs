import { cpSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function createDevWorkspace(root, source = root) {
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
  return workspace;
}
