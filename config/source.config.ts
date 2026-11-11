import { localePath } from '../src/lib/i18n/routing';
import { defineConfig, defineCollections } from 'fumadocs-mdx/config';
import { rehypeToc } from 'fumadocs-core/mdx-plugins';
import { readCatalog } from '../src/lib/content/manifest';
import { contentRoot } from '../src/lib/content/scan';
import { documentSchema } from '../src/lib/content/schema';
import { mkdirSync, writeFileSync } from 'node:fs';
import { locales } from '../src/lib/i18n/config';
import { contentMode } from './content-mode.mjs';
import { remarkMark } from 'remark-mark-highlight';
import { remarkMath, remarkValidateMath, rehypeMath, mathOptions } from '../src/lib/content/math';
import { remarkNumberJimmyNotes } from '../src/lib/content/note-numbers';
import { remarkMermaid } from '../src/lib/content/mermaid/remark';
import { codeFoldTransformer, remarkValidateCodeFolds } from '../src/lib/content/code-folds';
import { vocabularyPaths } from '../src/lib/vocabulary/collections';
const catalog = readCatalog();
// Freeze the checked public boundary at build time; runtime routes need no filesystem access.
mkdirSync(contentMode.generated, { recursive: true });
writeFileSync(`${contentMode.generated}/catalog.json`, JSON.stringify(catalog));
writeFileSync(`${contentMode.generated}/routes.json`, JSON.stringify([
  '/unavailable',
  ...locales.flatMap((locale) => [localePath(locale), localePath(locale, '/about'), localePath(locale, '/unavailable')]),
  ...catalog.documents.map((doc) => doc.url),
  ...locales.flatMap(locale => vocabularyPaths.map(path => localePath(locale, path))),
  // Design and component previews remain outside the published course catalog.
  '/design', '/design/a', '/design/b', '/design/c', '/design/components',
]));
export const courses = defineCollections({
  type: 'doc',
  dir: contentRoot(),
  schema: documentSchema,
  async: true,
  dynamic: process.env.NODE_ENV === 'development',
  files: catalog.documents.length ? catalog.documents.map((doc) => doc.file) : ['__no_published_content__.mdx'],
});
export default defineConfig({
  mdxOptions: {
    // Keep interactive heading components in the article, not module-level TOC exports.
    remarkHeadingOptions: { generateToc: true },
    valueToExport: ['toc'],
    remarkPlugins: (plugins) => [remarkMark, remarkMath, remarkValidateMath, remarkValidateCodeFolds, remarkNumberJimmyNotes, remarkMermaid, ...plugins],
    // Render math before Shiki can treat its generated code nodes as a programming language.
    rehypePlugins: (plugins) => [[rehypeMath, mathOptions], ...plugins.filter((plugin) => plugin !== rehypeToc)],
    rehypeCodeOptions: {
      themes: { light: 'github-light', dark: 'github-light' },
      transformers: [{ pre(node) { node.properties['data-language'] = this.options.lang; } }, codeFoldTransformer],
    },
  },
});
