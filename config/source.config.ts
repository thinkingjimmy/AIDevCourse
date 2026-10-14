/**
 * [INPUT]: Validated publication catalog and Fumadocs Config API.
 * [OUTPUT]: A local MDX collection containing only allowed content files, plus allowlisted /design preview routes.
 * [POS]: Build-time compiler boundary; fixtures require an isolated test build.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { readCatalog } from '../src/lib/content/manifest';
import { contentRoot } from '../src/lib/content/scan';
import { documentSchema } from '../src/lib/content/schema';
import { mkdirSync, writeFileSync } from 'node:fs';
import { locales } from '../src/lib/i18n/config';
const catalog = readCatalog();
// Freeze the checked public boundary at build time; runtime routes need no filesystem access.
mkdirSync('.source', { recursive: true });
writeFileSync('.source/catalog.json', JSON.stringify(catalog));
writeFileSync('.source/routes.json', JSON.stringify([
  ...locales.flatMap((locale) => [`/${locale}`, `/${locale}/courses`, `/${locale}/about`]),
  ...catalog.documents.map((doc) => doc.url),
  // Homepage studies. Not catalog pages, and not a replacement for /[lang].
  '/design', '/design/a', '/design/b', '/design/c',
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
