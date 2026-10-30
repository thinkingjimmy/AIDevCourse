import katex from 'katex';
import rehypeKatex from 'rehype-katex';
import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
export { default as remarkMath } from 'remark-math';

export const mathOptions = { output: 'htmlAndMathml', trust: false, strict: 'warn' } as const;

export function validateMath(tree: Root, file: string, lineOffset = 0) {
  visit(tree, (node) => {
    if (node.type !== 'math' && node.type !== 'inlineMath') return;
    try {
      katex.renderToString(node.value, { ...mathOptions, displayMode: node.type === 'math', throwOnError: true });
    } catch (error) {
      const start = node.position?.start;
      const location = `${file}:${(start?.line ?? 1) + lineOffset}:${start?.column ?? 1}`;
      throw new Error(`${location}: Invalid math: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

export const remarkValidateMath: Plugin<[], Root> = () => (tree, file) => {
  validateMath(tree, file.path || 'MDX');
};

export const rehypeMath: typeof rehypeKatex = (options) => {
  const render = rehypeKatex(options);
  return (tree, file) => {
    render(tree, file);
    visit(tree, 'element', (node) => {
      if (Array.isArray(node.properties.className) && node.properties.className.includes('katex-display')) {
        // Native focus keeps horizontal math scrolling usable without JavaScript, including Safari.
        node.properties.tabIndex = 0;
      }
    });
  };
};
