export const entranceTerms = [
  ['fade', 'Fade in / Fade out'], ['slide-in', 'Slide in'],
  ['scale-in', 'Scale in'], ['pop-in', 'Pop in'],
  ['reveal', 'Reveal'], ['enter-exit', 'Enter / Exit'],
] as const;

export type AnimationTermId = typeof entranceTerms[number][0];
export const animationCategories = [{ id: 'entrances-and-exits', terms: entranceTerms }] as const;

export function animationCategory(id: string) {
  return animationCategories.find(category => category.id === id);
}

export function isAnimationTermId(value: string): value is AnimationTermId {
  return animationCategories.some(category => category.terms.some(([id]) => id === value));
}
