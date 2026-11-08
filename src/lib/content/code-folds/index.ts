import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import type { RehypeCodeOptions } from 'fumadocs-core/mdx-plugins';
import { visit } from 'unist-util-visit';

export type CodeFold = { start: number; end: number };

export function parseCodeFolds(meta: string | null | undefined, source: string): CodeFold[] {
  const attributes = [...(meta ?? '').matchAll(/(?:^|\s)([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g)]
    .filter(match => match[1] === 'fold');
  if (!attributes.length) return [];
  if (attributes.length > 1) throw new Error('Use only one fold attribute');
  const value = attributes[0][2] ?? attributes[0][3];
  if (!value || !/^\d+-\d+(?:\s*,\s*\d+-\d+)*$/.test(value)) throw new Error('Use fold="start-end" or comma-separated ranges');
  const lines = source.split('\n');
  const folds = value.split(',').map(range => {
    const [start, end] = range.trim().split('-').map(Number);
    return { start, end };
  });
  for (const [index, fold] of folds.entries()) {
    if (fold.start < 1 || fold.end <= fold.start || fold.end > lines.length) {
      throw new Error('Fold ranges must contain a title line and at least one following line within the code block');
    }
    if (index && fold.start <= folds[index - 1].end) throw new Error('Fold ranges must be ordered and must not overlap');
    if (!lines[fold.start - 1].trim()) throw new Error('A fold title line must not be blank');
  }
  return folds;
}

export function validateCodeFolds(tree: Root, file: string, lineOffset = 0) {
  visit(tree, 'code', node => {
    try {
      const folds = parseCodeFolds(node.meta, node.value);
      if (folds.length && node.lang === 'mermaid') throw new Error('Code folding is not supported on Mermaid diagrams');
    } catch (error) {
      const start = node.position?.start;
      throw new Error(`${file}:${(start?.line ?? 1) + lineOffset}:${start?.column ?? 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

export const remarkValidateCodeFolds: Plugin<[], Root> = () => (tree, file) => {
  validateCodeFolds(tree, file.path || 'MDX');
};

export const codeFoldTransformer: NonNullable<RehypeCodeOptions['transformers']>[number] = {
  name: 'course-code-folds',
  pre(node) {
    const folds = parseCodeFolds(this.options.meta?.__raw, this.source);
    if (!folds.length) return;
    node.properties['data-code-folds'] = JSON.stringify(folds);
    // Copy uses the original text, including content hidden by native details.
    node.properties['data-code-source'] = this.source;
  },
};
