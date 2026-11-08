export type SelectionBounds = { left: number; right: number; top: number; bottom: number };
export type LessonSelection = { text: string; range: Range; rect: SelectionBounds; bounds: SelectionBounds };

const controls = 'button, input, textarea, select, [role="button"], [role="textbox"], [contenteditable]:not([contenteditable="false"]), [data-slot="lesson-completion"]';

export function isSelectionControl(node: Node | null) {
  const element = node instanceof Element ? node : node?.parentElement;
  return Boolean(element?.closest(controls));
}

export function sameSelection(first: LessonSelection | null, second: LessonSelection | null) {
  return Boolean(first && second && first.text === second.text
    && first.range.startContainer === second.range.startContainer && first.range.startOffset === second.range.startOffset
    && first.range.endContainer === second.range.endContainer && first.range.endOffset === second.range.endOffset);
}

export function measureLessonRange(article: HTMLElement, range: Range) {
  const pane = article.closest('[data-slot="lesson-region"]');
  if (!pane) return null;
  const paneRect = pane.getBoundingClientRect();
  const bounds = { left: Math.max(0, paneRect.left), right: Math.min(innerWidth, paneRect.right),
    top: Math.max(0, paneRect.top), bottom: Math.min(innerHeight, paneRect.bottom) };
  const fragments = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0
    && rect.right > bounds.left && rect.left < bounds.right && rect.bottom > bounds.top && rect.top < bounds.bottom);
  if (!fragments.length || bounds.right - bounds.left < 48 || bounds.bottom - bounds.top < 80) return null;
  const rect = {
    left: Math.max(bounds.left, Math.min(...fragments.map(fragment => fragment.left))),
    right: Math.min(bounds.right, Math.max(...fragments.map(fragment => fragment.right))),
    top: Math.max(bounds.top, Math.min(...fragments.map(fragment => fragment.top))),
    bottom: Math.min(bounds.bottom, Math.max(...fragments.map(fragment => fragment.bottom))),
  };
  return { rect, bounds };
}

export function readLessonSelection(article: HTMLElement): LessonSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount !== 1 || isSelectionControl(document.activeElement)) return null;
  const range = selection.getRangeAt(0);
  if (!article.contains(range.startContainer) || !article.contains(range.endContainer)
    || isSelectionControl(range.startContainer) || isSelectionControl(range.endContainer)) return null;
  const text = selection.toString().trim();
  const geometry = text && measureLessonRange(article, range);
  return geometry ? { text, range: range.cloneRange(), ...geometry } : null;
}
