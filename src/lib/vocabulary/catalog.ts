export const typographyTerms = [
  ['kerning', 'Kerning'], ['tracking', 'Tracking'], ['leading', 'Leading'],
  ['optical-kerning', 'Optical kerning'], ['tabular-nums', 'Tabular numerals'],
  ['type-scale', 'Type scale'], ['weight', 'Font weight'], ['x-height', 'X-height'],
  ['cap-height', 'Cap height'], ['ligature', 'Ligature'], ['font-smoothing', 'Font smoothing'],
  ['text-overflow', 'Text overflow'], ['hyphenation', 'Hyphenation'], ['clamp', 'Clamp'],
  ['widow', 'Widow'], ['orphan', 'Orphan'], ['font-stack', 'Font stack'],
  ['line-length', 'Line length'], ['variable-font', 'Variable font'],
  ['superscript', 'Superscript'], ['subscript', 'Subscript'],
] as const;

export const colorTerms = [
  ['srgb', 'sRGB'], ['p3', 'P3'], ['oklch', 'OKLCH'], ['alpha', 'Alpha'],
  ['semantic-token', 'Semantic token'], ['contrast-ratio', 'Contrast ratio'],
  ['tinted-neutral', 'Tinted neutral'], ['saturation', 'Saturation'],
  ['chroma', 'Chroma'], ['gradient', 'Gradient'],
  ['opacity-vs-visibility', 'Opacity vs visibility'], ['dark-mode', 'Dark mode'],
  ['blending', 'Blending'],
] as const;

export type TypographyTermId = typeof typographyTerms[number][0];
export type ColorTermId = typeof colorTerms[number][0];
export type TermId = TypographyTermId | ColorTermId;
export const vocabularyCategories = [
  { id: 'typography', terms: typographyTerms },
  { id: 'color', terms: colorTerms },
] as const;

export function vocabularyCategory(id: string) {
  return vocabularyCategories.find(category => category.id === id);
}

export function isColorTermId(value: TermId): value is ColorTermId {
  return colorTerms.some(([id]) => id === value);
}
