import { renameSync, writeFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import type { EmitEntry, Plugin } from 'fumadocs-mdx';
import type { InspectionCache } from '../../src/lib/content/scan';
import { locales } from '../../src/lib/i18n/config';
import { localePath } from '../../src/lib/i18n/routing';
import { hasDocumentPage } from '../../src/lib/content/model';
import { vocabularyPaths } from '../../src/lib/vocabulary/collections';
import { contentMode } from './content-mode.mjs';

const fixedRoutes = [
  '/unavailable', '/design', '/design/a', '/design/b', '/design/c', '/design/components',
  ...locales.flatMap(locale => [localePath(locale), localePath(locale, '/about'), localePath(locale, '/unavailable'),
    ...vocabularyPaths.map(path => localePath(locale, path))]),
];

export function catalogPlugin(): Plugin {
  let previous = new Map<string, string>();
  const inspections: InspectionCache | undefined = process.env.NODE_ENV === 'development' ? new Map() : undefined;

  // Dynamic article loaders also import the MDX config. Only the generator needs the scanner.
  async function entries(): Promise<EmitEntry[]> {
    const { readCatalog } = await import('../../src/lib/content/manifest');
    try {
      const catalog = readCatalog({ inspections });
      // JSON omits undefined fields. The article loader supplies the body.
      const documents = catalog.documents.map(document => ({ ...document, body: undefined }));
      return [
        { path: 'catalog.json', content: JSON.stringify({ ...catalog, documents }) },
        { path: 'routes.json', content: JSON.stringify([...fixedRoutes, ...documents.filter(hasDocumentPage).map(doc => doc.url)]) },
      ];
    } catch (error) {
      if (process.env.NODE_ENV !== 'development') throw error;
      // Keep the watcher and existing URLs live while the author fixes an invalid edit.
      return [
        { path: 'catalog.json', content: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) },
        { path: 'routes.json', content: previous.get('routes.json') ?? JSON.stringify(fixedRoutes) },
      ];
    }
  }

  return {
    name: 'published-catalog',
    async emit() {
      const output = await entries();
      previous = new Map(output.map(entry => [entry.path, entry.content]));
      return output;
    },
    configureServer({ watcher }) {
      if (!watcher) return;
      const content = resolve(contentMode.content) + sep;
      const assets = resolve('public') + sep;
      const { outDir } = this.core;
      let timer: ReturnType<typeof setTimeout>;

      async function refresh() {
        for (const { path, content } of await entries()) {
          if (previous.get(path) === content) continue;
          const file = join(outDir, path);
          writeFileSync(file + '.tmp', content);
          renameSync(file + '.tmp', file);
          previous.set(path, content);
        }
      }
      function schedule() {
        clearTimeout(timer);
        timer = setTimeout(() => { if (!watcher?.closed) void refresh(); }, 25);
      }
      watcher.add(resolve('public'));
      // Cover edits made between the initial emit and watcher registration.
      watcher.once('ready', schedule);
      watcher.on('all', (event, file) => {
        const path = resolve(file);
        if (path.startsWith(assets) || (path.startsWith(content) &&
          (event === 'addDir' || event === 'unlinkDir' || basename(path) === 'meta.json' || /\.mdx?$/.test(path)))) schedule();
      });
    },
  };
}
