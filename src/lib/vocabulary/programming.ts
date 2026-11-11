export const webTerms = [['static-website', 'Static website']] as const;

export type ProgrammingTermId = typeof webTerms[number][0];
export const programmingCategories = [{ id: 'web-foundations', terms: webTerms }] as const;

export function programmingCategory(id: string) {
  return programmingCategories.find(category => category.id === id);
}

export function isProgrammingTermId(value: string): value is ProgrammingTermId {
  return programmingCategories.some(category => category.terms.some(([id]) => id === value));
}

export function programmingTerm(id: string) {
  return programmingCategories.flatMap(category => category.terms.map(([id, english]) => ({ id, english, category })))
    .find(term => term.id === id);
}

export const programmingSections = {
  'static-website': ['meaning', 'how-it-works', 'example', 'interaction', 'comparison', 'uses', 'misconceptions', 'recap', 'references'],
} as const;

export function isProgrammingAnchor(value: string) {
  return isProgrammingTermId(value) || Object.values(programmingSections).some(sections => sections.some(id => id === value));
}
