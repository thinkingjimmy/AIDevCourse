'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

function measureAnchor(anchor: HTMLElement) {
  const fragments = [...anchor.getClientRects()].filter(rect => rect.width && rect.height);
  const image = anchor.dataset.noteAnchorVariant === 'image';
  const last = image ? fragments[0] : fragments.at(-1);
  if (!last) return null;
  if (image) {
    const midpointY = last.top + last.height / 2;
    return { x: last.right + 4, y: midpointY, entryY: midpointY, image };
  }

  const block = anchor.closest('p, li, h1, h2, h3, h4, h5, h6, td, th') ?? anchor.parentElement!;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const rectangles: DOMRect[] = [];
  while (walker.nextNode()) {
    if (!walker.currentNode.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(walker.currentNode);
    rectangles.push(...range.getClientRects());
  }
  const sameLine = rectangles.filter(rect => Math.abs(rect.top - last.top) < last.height * 0.5);
  const lineBottom = Math.max(last.bottom, ...sameLine.map(rect => rect.bottom));
  const nextTop = Math.min(...rectangles.filter(rect => rect.top > last.top + last.height * 0.7).map(rect => rect.top));
  const gap = Number.isFinite(nextTop) ? Math.max(8, nextTop - lineBottom) : 18;
  // Keep the full 3px point below punctuation, including Firefox's tighter line metrics.
  return { x: last.right + 5, y: lineBottom + 4, entryY: lineBottom + Math.min(10, gap * 0.75), image };
}

export function useNoteLayout(root: RefObject<HTMLDivElement | null>, close: () => void) {
  const [rail, setRail] = useState<HTMLElement | null>(null);
  const cards = useRef(new Map<string, HTMLDivElement>());
  const schedule = useRef(() => {});
  const observer = useRef<ResizeObserver | null>(null);
  const registerCard = useCallback((id: string, element: HTMLDivElement | null) => {
    const previous = cards.current.get(id);
    if (previous) observer.current?.unobserve(previous);
    if (element) {
      cards.current.set(id, element);
      observer.current?.observe(element);
    } else cards.current.delete(id);
    schedule.current();
  }, []);

  useEffect(() => {
    const scope = root.current;
    if (!scope) return;
    const host = scope.querySelector<HTMLElement>('[data-slot="jimmy-note-rail"]');
    if (!host) return;
    const column = host.parentElement!;
    const article = scope.querySelector('article');
    const scroller = scope.closest('[data-slot="lesson-region"]') ?? window;
    let currentRail: HTMLElement | null = null;
    let frame = 0;
    let disposed = false;

    function update() {
      frame = 0;
      const nextRail = column.getClientRects().length && column.clientWidth ? host : null;
      if (nextRail !== currentRail) {
        currentRail = nextRail;
        close();
        setRail(nextRail);
      }
      if (!nextRail) {
        column.style.minHeight = '';
        return;
      }

      const railBounds = nextRail.getBoundingClientRect();
      const origin = railBounds.top;
      const gutterX = Math.min(-4, (article?.getBoundingClientRect().right ?? railBounds.left - 32) - railBounds.left + 8);
      let bottom = 0;
      const positions: { card: HTMLElement; top: number; path: string; startX: number; startY: number; strokeWidth: number }[] = [];
      for (const anchor of scope!.querySelectorAll<HTMLElement>('[data-jimmy-note-anchor]')) {
        const card = cards.current.get(anchor.dataset.jimmyNoteAnchor!);
        const source = measureAnchor(anchor);
        if (!card || !source) continue;
        const inset = 28;
        const requestedTop = source.entryY - origin - inset;
        const top = Math.max(0, requestedTop, bottom ? bottom + 16 : 0);
        const bounds = card.getBoundingClientRect();
        const height = bounds.height;
        const noteStyle = getComputedStyle(card.querySelector('[data-component="jimmy-note"]')!);
        const borderWidth = parseFloat(noteStyle.borderTopWidth);
        const strokeWidth = borderWidth || parseFloat(noteStyle.getPropertyValue('--note-line-width'));
        const endX = borderWidth / 2;
        const endY = inset;
        const startX = source.x - railBounds.left;
        const startY = source.y - origin - top;
        const leadX = Math.min(-4, startX + 12);
        let path = source.image ? `M ${startX} ${startY} L ${endX} ${endY}` : `M ${startX} ${startY} L ${leadX} ${endY} H ${endX}`;
        if (!source.image && top > requestedTop + 1) {
          // Stacked cards leave the text column through its line gap before descending in the gutter.
          const lineY = source.entryY - origin - top;
          path = `M ${startX} ${startY} L ${Math.min(gutterX, leadX)} ${lineY} H ${gutterX} L -4 ${endY} H ${endX}`;
        }
        bottom = top + height;
        positions.push({ card, top, path, startX, startY, strokeWidth });
      }

      // Keep layout reads together before writing card positions and connectors.
      for (const { card, top, path, startX, startY, strokeWidth } of positions) {
        card.style.transform = `translateY(${top}px)`;
        card.style.visibility = 'visible';
        const connector = card.querySelector('[data-note-connector]')!;
        connector.setAttribute('d', path);
        // Match framed notes' used border width; borderless embeds keep the shared line width.
        connector.setAttribute('stroke-width', String(strokeWidth));
        const point = card.querySelector('[data-note-connector-start]')!;
        point.setAttribute('cx', String(startX));
        point.setAttribute('cy', String(startY));
      }
      const minimum = bottom ? `${Math.ceil(bottom + 4)}px` : '';
      if (column.style.minHeight !== minimum) column.style.minHeight = minimum;
    }

    function requestUpdate() {
      if (!disposed && !frame) frame = window.requestAnimationFrame(update);
    }
    schedule.current = requestUpdate;
    const resize = new ResizeObserver(requestUpdate);
    observer.current = resize;
    resize.observe(scope);
    if (article) resize.observe(article);
    for (const card of cards.current.values()) resize.observe(card);
    scroller.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    window.addEventListener('hashchange', requestUpdate);
    window.addEventListener('pageshow', requestUpdate);
    document.fonts.addEventListener('loadingdone', requestUpdate);
    void document.fonts.ready.then(requestUpdate);
    requestUpdate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resize.disconnect();
      observer.current = null;
      schedule.current = () => {};
      column.style.minHeight = '';
      scroller.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      window.removeEventListener('hashchange', requestUpdate);
      window.removeEventListener('pageshow', requestUpdate);
      document.fonts.removeEventListener('loadingdone', requestUpdate);
    };
  }, [root, close]);

  return { rail, registerCard };
}
