/**
 * [INPUT]: Validated publication catalog, isolated content mode, and Fumadocs Config API, canonical locale paths.
 * [OUTPUT]: A local MDX collection containing only allowed content files, plus allowlisted /design preview routes.
 * [POS]: Build-time compiler boundary; fixtures require an isolated test build.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { localePath } from '../src/lib/i18n/routing';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { readCatalog } from '../src/lib/content/manifest';
import { contentRoot } from '../src/lib/content/scan';
import { documentSchema } from '../src/lib/content/schema';
import { mkdirSync, writeFileSync } from 'node:fs';
import { locales } from '../src/lib/i18n/config';
import { contentMode } from './content-mode.mjs';
const catalog = readCatalog();
// Freeze the checked public boundary at build time; runtime routes need no filesystem access.
mkdirSync(contentMode.generated, { recursive: true });
writeFileSync(`${contentMode.generated}/catalog.json`, JSON.stringify(catalog));
writeFileSync(`${contentMode.generated}/routes.json`, JSON.stringify([
  '/unavailable',
  ...locales.flatMap((locale) => [localePath(locale), localePath(locale, '/about'), localePath(locale, '/unavailable')]),
  ...catalog.documents.map((doc) => doc.url),
  // Design and component previews remain outside the published course catalog.
  '/design', '/design/a', '/design/b', '/design/c', '/design/components',
]));
export const courses = defineDocs({
  dir: contentRoot(),
  docs: { schema: documentSchema, files: catalog.documents.length ? catalog.documents.map((doc) => doc.file) : ['__no_published_content__.mdx'] },
  meta: { files: ['**/meta.json'] },
});
export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: { light: 'github-light', dark: 'github-light' },
      transformers: [{ pre(node) { node.properties['data-language'] = this.options.lang; } }],
    },
  },
});
