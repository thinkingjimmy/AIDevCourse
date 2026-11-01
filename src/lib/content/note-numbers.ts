import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

type NoteElement = {
  name: string;
  attributes: { type: string; name?: string; value?: unknown }[];
};

export function remarkNumberJimmyNotes() {
  return (tree: Root) => {
    const numbers = new Map<string, string>();
    visit(tree, ['mdxJsxTextElement', 'mdxJsxFlowElement'], node => {
      const element = node as unknown as NoteElement;
      if (element.name !== 'JimmyNoteAnchor') return;
      const id = element.attributes.find(attribute => attribute.name === 'id')?.value;
      if (typeof id === 'string' && !numbers.has(id)) numbers.set(id, String(numbers.size + 1));
    });
    visit(tree, ['mdxJsxTextElement', 'mdxJsxFlowElement'], node => {
      const element = node as unknown as NoteElement;
      if (!['JimmyNoteAnchor', 'JimmyNote'].includes(element.name)) return;
      const id = element.attributes.find(attribute => attribute.name === (element.name === 'JimmyNoteAnchor' ? 'id' : 'anchor'))?.value;
      const number = typeof id === 'string' ? numbers.get(id) : undefined;
      if (!number) return;
      const existing = element.attributes.find(attribute => attribute.name === 'noteNumber');
      if (existing) existing.value = number;
      else element.attributes.push({ type: 'mdxJsxAttribute', name: 'noteNumber', value: number });
    });
  };
}
