import { render } from 'pele';
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

export function renderMermaid(source: string, idPrefix = 'mermaid') {
  return render(source, { idPrefix, responsive: false, links: false, images: false });
}

export function validateMermaid(tree: Root, file: string, lineOffset = 0) {
  visit(tree, 'code', node => {
    if (node.lang !== 'mermaid') return;
    try {
      renderMermaid(node.value);
    } catch (error) {
      const start = node.position?.start;
      const location = `${file}:${(start?.line ?? 1) + lineOffset}:${start?.column ?? 1}`;
      throw new Error(`${location}: Invalid Mermaid: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}
