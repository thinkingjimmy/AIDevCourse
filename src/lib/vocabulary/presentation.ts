import type { Locale } from '@/lib/i18n/config';
import type { TypographyTermId } from './catalog';
import type { DictionaryCategory, DictionaryTerm, DictionaryTermId } from './collections';

type TypographySectionId = 'interface' | 'letterforms';

export type VocabularySection = {
  id: string;
  title?: `typographySections.${TypographySectionId}.title`;
  description?: 'typographySections.letterforms.description';
  terms: readonly DictionaryTerm[];
};

const sectionOrder: Record<Locale, readonly TypographySectionId[]> = {
  en: ['letterforms', 'interface'],
  zh: ['interface', 'letterforms'],
  ja: ['interface', 'letterforms'],
  fr: ['letterforms', 'interface'],
  es: ['letterforms', 'interface'],
};

// These examples use Latin letterforms or word boundaries, including in mixed text.
const letterTerms = new Set<TypographyTermId>([
  'kerning', 'optical-kerning', 'x-height', 'cap-height', 'ligature', 'hyphenation', 'widow',
]);
const featured: Record<TypographySectionId, readonly TypographyTermId[]> = {
  interface: ['leading', 'tracking', 'text-overflow'],
  letterforms: ['kerning', 'x-height', 'hyphenation'],
};

export function vocabularyPresentation(category: DictionaryCategory, locale: Locale) {
  if (category.id !== 'typography') {
    return { sections: [{ id: category.id, terms: category.terms }] as VocabularySection[], terms: category.terms };
  }

  const sections: VocabularySection[] = sectionOrder[locale].map(id => {
    const members = category.terms.filter(([term]) => letterTerms.has(term) === (id === 'letterforms'));
    const promoted = featured[id].flatMap(term => members.filter(([member]) => member === term));
    return {
      id,
      title: `typographySections.${id}.title`,
      description: id === 'letterforms' ? 'typographySections.letterforms.description' : undefined,
      terms: [...promoted, ...members.filter(([term]) => !featured[id].includes(term))],
    };
  });
  const firstBatch = sections.flatMap(section => section.terms.slice(0, 3));
  const firstIds = new Set<DictionaryTermId>(firstBatch.map(([id]) => id));
  return { sections, terms: [...firstBatch, ...category.terms.filter(([id]) => !firstIds.has(id))] };
}
