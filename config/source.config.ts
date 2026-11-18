import { defineConfig, defineCollections } from 'fumadocs-mdx/config';
import { rehypeToc, remarkStructureDefaultOptions } from 'fumadocs-core/mdx-plugins';
import { documentSchema } from '../src/lib/content/schema';
import { locales } from '../src/lib/i18n/config';
import { contentMode } from './content/content-mode.mjs';
import { remarkMark } from 'remark-mark-highlight';
import { remarkMath, remarkValidateMath, rehypeMath, mathOptions } from '../src/lib/content/math';
import { remarkNumberJimmyNotes } from '../src/lib/content/note-numbers';
import { remarkMermaid } from '../src/lib/content/mermaid/remark';
import { codeFoldTransformer, remarkValidateCodeFolds } from '../src/lib/content/code-folds';
import { catalogPlugin } from './content/catalog-plugin';

export const courses = defineCollections({
  type: 'doc',
  dir: contentMode.content,
  schema: documentSchema,
  async: true,
  dynamic: process.env.NODE_ENV === 'development',
  files: [...locales.map(locale => `${locale}/**/*.{md,mdx}`), '!**/README.md'],
});
export default defineConfig({
  plugins: [catalogPlugin()],
  mdxOptions: {
    // Keep interactive heading components in the article, not module-level TOC exports.
    remarkHeadingOptions: { generateToc: true },
    remarkStructureOptions: {
      mdxTypes: (node) => remarkStructureDefaultOptions.mdxTypes(node) || (node.name === 'Chat' && node.attributes.length > 0),
      stringify: {
        stringify(node, _parent, _state, _info, context) {
          if (node.type !== 'mdxJsxFlowElement' || node.name !== 'Chat') return undefined;
          const input = node.attributes.find(attribute => attribute.type === 'mdxJsxAttribute' && attribute.name === 'input')?.value;
          const content = typeof input === 'string' ? input.trim() : '';
          if (content) context.addContent({ content, heading: undefined });
          return undefined;
        },
      },
    },
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
