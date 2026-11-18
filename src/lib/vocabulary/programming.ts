export const webTerms = [['static-website', 'Static website']] as const;
export const versionControlTerms = [['git', 'Git']] as const;
export const runtimeTerms = [['node-js', 'Node.js'], ['next-js', 'Next.js']] as const;
export const cloudTerms = [['vercel', 'Vercel'], ['cloudflare', 'Cloudflare'], ['supabase', 'Supabase']] as const;

export const programmingCategories = [
  { id: 'web-foundations', terms: webTerms },
  { id: 'version-control', terms: versionControlTerms },
  { id: 'runtime-and-framework', terms: runtimeTerms },
  { id: 'deployment-and-cloud', terms: cloudTerms },
] as const;

export type ProgrammingTermId = (typeof programmingCategories)[number]['terms'][number][0];

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

const articleSections = ['meaning', 'how-it-works', 'example', 'comparison', 'uses', 'misconceptions', 'recap', 'references'] as const;

export const programmingSections = {
  'static-website': ['meaning', 'how-it-works', 'example', 'interaction', 'comparison', 'uses', 'misconceptions', 'recap', 'references'],
  git: articleSections,
  'node-js': articleSections,
  'next-js': articleSections,
  vercel: articleSections,
  cloudflare: articleSections,
  supabase: articleSections,
} as const;

export function isProgrammingAnchor(value: string) {
  return isProgrammingTermId(value) || Object.values(programmingSections).some(sections => sections.some(id => id === value));
}
