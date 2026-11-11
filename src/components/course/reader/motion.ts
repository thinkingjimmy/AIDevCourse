export const readingMotion = {
  enter: 240,
  exit: 180,
  content: 160,
  easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
} as const;

export type SourceMotion = { article: HTMLElement; left: number; count: number; duration: number };

export function canAnimateReading(pointer: boolean) {
  return pointer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function captureSourceMotion(stage: HTMLElement | null, count: number, duration: number): SourceMotion | null {
  if (window.matchMedia('(max-width: 960px)').matches) return null;
  const article = stage?.querySelector<HTMLElement>('[data-slot="reading-primary"] article');
  return article ? { article, left: article.getBoundingClientRect().left, count, duration } : null;
}

export function animateSource(motion: SourceMotion): Pick<Animation, 'cancel'> | null {
  if (!motion.article.isConnected) return null;
  const offset = motion.left - motion.article.getBoundingClientRect().left;
  if (Math.abs(offset) < 1) return null;
  const scroller = motion.article.closest<HTMLElement>('[data-slot="lesson-region"]');
  if (!scroller) return null;
  const overflow = scroller.style.overflowX;
  // The translated article must not create a temporary scrollbar and resize its own observer.
  scroller.style.overflowX = 'hidden';
  const restore = () => { scroller.style.overflowX = overflow; };
  const animation = motion.article.animate([{ transform: `translateX(${offset}px)` }, { transform: 'translateX(0)' }], {
    duration: motion.duration, easing: readingMotion.easing,
  });
  animation.onfinish = restore;
  return { cancel() { animation.onfinish = null; animation.cancel(); restore(); } };
}
