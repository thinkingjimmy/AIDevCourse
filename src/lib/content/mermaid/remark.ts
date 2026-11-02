import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { validateMermaid } from './render';

export const remarkMermaid: Plugin<[], Root> = () => (tree, file) => {
  validateMermaid(tree, file.path || 'MDX');
  visit(tree, 'code', (node, index, parent) => {
    if (node.lang !== 'mermaid' || index === undefined || !parent) return;
    // Replace the fence before Shiki; authors cannot invoke this internal component directly.
    parent.children[index] = {
      type: 'mdxJsxFlowElement', name: 'MermaidDiagram',
      attributes: [{ type: 'mdxJsxAttribute', name: 'source', value: node.value }],
      children: [], position: node.position,
    };
  });
};
