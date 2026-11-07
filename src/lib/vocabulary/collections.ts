import { vocabularyCategories } from './catalog';
import { animationCategories } from './animation';

export const vocabularyCollections = {
  design: {
    id: 'design', resourceId: 'vocabulary', namespace: 'Vocabulary', path: '/vocabulary',
    source: 'https://index.how/to/articulate', categories: vocabularyCategories,
  },
  animation: {
    id: 'animation', resourceId: 'animation-vocabulary', namespace: 'AnimationVocabulary', path: '/animation-vocabulary',
    source: 'https://animations.dev/vocabulary#entrances-and-exits', categories: animationCategories,
  },
} as const;

export type VocabularyKind = keyof typeof vocabularyCollections;
export type DictionaryCategory = typeof vocabularyCollections[VocabularyKind]['categories'][number];
export type DictionaryTerm = DictionaryCategory['terms'][number];
export type DictionaryTermId = DictionaryTerm[0];
export const vocabularyPaths = Object.values(vocabularyCollections).flatMap(collection =>
  [collection.path, ...collection.categories.map(category => `${collection.path}/${category.id}`)]);

export function vocabularyForPath(path: string) {
  return Object.values(vocabularyCollections).find(collection =>
    path === collection.path || collection.categories.some(category => path === `${collection.path}/${category.id}`));
}

export function isDictionaryTerm(value: string, kind: VocabularyKind): value is DictionaryTermId {
  return vocabularyCollections[kind].categories.some(category => category.terms.some(([id]) => id === value));
}
