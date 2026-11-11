import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readCatalog } from '../manifest';
import { contentRoot } from '../scan';
import type { Catalog } from '../model';

let cached: { signature: string; catalog: Catalog } | undefined;

function fingerprint(root: string) {
  return [root, ...readdirSync(root, { recursive: true, withFileTypes: true }).map(entry => join(entry.parentPath, entry.name))]
    .sort().map(path => {
      const stat = statSync(path, { bigint: true });
      return `${path}:${stat.mtimeNs}:${stat.ctimeNs}:${stat.size}`;
    }).join('\n');
}

export function readCatalogSnapshot(): Catalog {
  // Include assets so a removed image still fails validation, even when no lesson changed.
  const signature = `${fingerprint(contentRoot())}\n${fingerprint(join(process.cwd(), 'public'))}`;
  if (cached?.signature === signature) return cached.catalog;
  const catalog = readCatalog();
  cached = { signature, catalog };
  return catalog;
}
