/**
 * [INPUT]: Markdown/MDX AST, a local image root, and component allowlist.
 * [OUTPUT]: Safe headings, references, and actionable authoring errors.
 * [POS]: Syntax validation before trusted local content reaches the compiler.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import type { Root } from 'mdast';
import type { ContentDocument } from './types';
export const supportedComponents = ['Callout', 'Steps', 'Step'] as const;
export function inspectMarkdown(body: string, file: string) {
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkMdx).parse(body) as Root;
  const slugger = new GithubSlugger();
  const headings: ContentDocument['headings'] = [];
  const links: ContentDocument['links'] = [];
  const definitions = new Map<string, string>();
  visit(tree, 'definition', (node) => { definitions.set(node.identifier, node.url); });
  const fail = (message: string) => { throw new Error(`${file}: ${message}`); };
  visit(tree, (node) => {
    if (node.type === 'heading') {
      if (node.depth === 1) fail('Use level-two headings; the lesson title is the only h1');
      const title = toString(node);
      headings.push({ id: slugger.slug(title), title, depth: node.depth });
    }
    if (node.type === 'link' || node.type === 'image') {
      const label = node.type === 'image' ? node.alt ?? '' : toString(node);
      if (node.type === 'image' && !label.trim()) fail('Images require meaningful localized alt text');
      links.push({ url: node.url, image: node.type === 'image', label });
    }
    if (node.type === 'linkReference' || node.type === 'imageReference') {
      const url = definitions.get(node.identifier);
      if (!url) fail(`Unresolved reference: ${node.identifier}`);
      const label = node.type === 'imageReference' ? node.alt ?? '' : toString(node);
      if (node.type === 'imageReference' && !label.trim()) fail('Images require alt text');
      links.push({ url: url!, image: node.type === 'imageReference', label });
    }
    if (['mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression', 'html'].includes(node.type)) {
      fail('Imports, expressions, scripts, and raw HTML are not supported in lessons');
    }
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      const element = node as unknown as { name: string; attributes: { type: string; name: string; value: unknown }[] };
      if (!supportedComponents.includes(element.name as typeof supportedComponents[number])) fail(`Unknown component: ${element.name}`);
      for (const attribute of element.attributes) {
        if (attribute.type !== 'mdxJsxAttribute' || !['title', 'type'].includes(attribute.name) || typeof attribute.value !== 'string') {
          fail(`Unsupported attribute on ${element.name}; use static title/type strings`);
        }
      }
    }
  });
  // JSX inside code fences remains ordinary text and never enters this policy.
  return { headings, links, plainText: toString(tree) };
}
