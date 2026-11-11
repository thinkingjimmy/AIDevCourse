import { vocabularyCategories } from './catalog';
import { animationCategories } from './animation';
import { programmingCategories } from './programming';

export const vocabularyCollections = {
  design: {
    id: 'design', resourceId: 'vocabulary', namespace: 'Vocabulary', path: '/vocabulary',
    source: 'https://index.how/to/articulate', categories: vocabularyCategories,
  },
  animation: {
    id: 'animation', resourceId: 'animation-vocabulary', namespace: 'AnimationVocabulary', path: '/animation-vocabulary',
    source: 'https://animations.dev/vocabulary#entrances-and-exits', categories: animationCategories,
  },
  programming: {
    id: 'programming', resourceId: 'programming-vocabulary', namespace: 'ProgrammingVocabulary', path: '/programming-vocabulary',
    source: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/First_steps/Client-Server_overview#static_sites',
    categories: programmingCategories,
  },
} as const;

export type VocabularyKind = keyof typeof vocabularyCollections;
export type DictionaryCategory = typeof vocabularyCollections[VocabularyKind]['categories'][number];
export type DictionaryTerm = DictionaryCategory['terms'][number];
export type DictionaryTermId = DictionaryTerm[0];

export function vocabularyTermPath(kind: VocabularyKind, category: string, term: DictionaryTermId) {
  const path = vocabularyCollections[kind].path;
  return kind === 'programming' ? `${path}/${term}` : `${path}/${category}#${term}`;
}

export function vocabularyPagePaths(kind: VocabularyKind) {
  const collection = vocabularyCollections[kind];
  return collection.categories.flatMap(category => kind === 'programming'
    ? category.terms.map(([id]) => `${collection.path}/${id}`)
    : [`${collection.path}/${category.id}`]);
}

export const vocabularyPaths = Object.values(vocabularyCollections).flatMap(collection =>
  [collection.path, ...new Set([...vocabularyPagePaths(collection.id), ...collection.categories.map(category => `${collection.path}/${category.id}`)])]);

export function vocabularyForPath(path: string) {
  return Object.values(vocabularyCollections).find(collection =>
    path === collection.path || vocabularyPagePaths(collection.id).includes(path) || collection.categories.some(category => path === `${collection.path}/${category.id}`));
}

export function isDictionaryTerm(value: string, kind: VocabularyKind): value is DictionaryTermId {
  return vocabularyCollections[kind].categories.some(category => category.terms.some(([id]) => id === value));
}
