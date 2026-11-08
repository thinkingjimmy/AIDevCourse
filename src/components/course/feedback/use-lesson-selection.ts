'use client';

import { useEffect, useState, type RefObject } from 'react';
import { isSelectionControl, measureLessonRange, readLessonSelection, sameSelection, type LessonSelection } from './selection';

const selectionKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

export function useLessonSelection(articleRef: RefObject<HTMLElement | null>, menuRef: RefObject<HTMLDivElement | null>) {
  const [selection, setSelection] = useState<LessonSelection | null>(null);

  useEffect(() => {
    const article = articleRef.current;
    const pane = article?.closest('[data-slot="lesson-region"]');
    if (!article || !pane) return;
    const desktop = window.matchMedia('(hover: hover) and (pointer: fine)');
    let current: LessonSelection | null = null;
    let dismissed: LessonSelection | null = null;
    let previousFocus: HTMLElement = article;
    let pointerDown = false;
    let touch = false;
    let keyboardSelecting = false;
    let restoring = false;
    let frame = 0;
    let focusFrame = 0;

    const insideMenu = (node: EventTarget | null) => node instanceof Node && Boolean(menuRef.current?.contains(node));
    const hide = () => {
      // Native key events can arrive before React commits the closed state.
      if (menuRef.current) menuRef.current.style.visibility = 'hidden';
      current = null;
      setSelection(null);
    };
    const close = (restoreFocus = false) => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(focusFrame);
      dismissed = current ?? readLessonSelection(article);
      if (restoreFocus && insideMenu(document.activeElement)) {
        restoring = true;
        previousFocus.focus({ preventScroll: true });
        if (current?.range.startContainer.isConnected && current.range.endContainer.isConnected) {
          const native = window.getSelection();
          native?.removeAllRanges();
          native?.addRange(current.range);
        }
        restoring = false;
      }
      hide();
    };
    const update = () => {
      if (pointerDown || keyboardSelecting || touch || !desktop.matches || insideMenu(document.activeElement)) return;
      const next = readLessonSelection(article);
      if (!next) {
        dismissed = null;
        hide();
        return;
      }
      if (sameSelection(next, dismissed)) return;
      if (!current) {
        const focused = document.activeElement;
        previousFocus = focused instanceof HTMLElement && focused !== document.body ? focused : article;
      }
      current = next;
      setSelection(next);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (insideMenu(event.target)) return;
      close();
      pointerDown = true;
      touch = event.pointerType !== 'mouse';
      if (!touch && event.button === 0 && event.target instanceof Node && article.contains(event.target)) dismissed = null;
    };
    const onPointerUp = () => { pointerDown = false; schedule(); };
    const onPointerCancel = () => { pointerDown = false; close(); };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && current) {
        event.preventDefault();
        close(true);
      } else if (event.key === 'Tab' && current) {
        const links = [...menuRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []];
        const index = links.indexOf(document.activeElement as HTMLAnchorElement);
        const next = index + (event.shiftKey ? -1 : 1);
        if (links.length && (!event.shiftKey && index === -1 || index >= 0 && next >= 0 && next < links.length)) {
          event.preventDefault();
          const target = links[index === -1 ? 0 : next];
          target.focus({ preventScroll: true });
          // WebKit may not focus a newly positioned portal until the next frame.
          if (document.activeElement !== target) {
            cancelAnimationFrame(focusFrame);
            focusFrame = requestAnimationFrame(() => {
              if (current && insideMenu(target)) target.focus({ preventScroll: true });
            });
          }
        } else if (index >= 0) {
          if (event.shiftKey) event.preventDefault();
          close(true);
        }
      } else if (event.shiftKey && selectionKeys.has(event.key) && !isSelectionControl(event.target as Node) && !insideMenu(event.target)) {
        touch = false;
        keyboardSelecting = true;
        close();
        dismissed = null;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (keyboardSelecting && (selectionKeys.has(event.key) || event.key === 'Shift')) {
        keyboardSelecting = false;
        schedule();
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (current && !restoring && !insideMenu(event.target)) close();
    };
    const onLayoutChange = () => {
      // A new selection can itself scroll into view before its menu is measured.
      if (current) close(true);
    };
    const onResize = () => {
      if (!current) return;
      const geometry = measureLessonRange(article, current.range);
      // ResizeObserver may deliver a change already reflected in a new selection.
      if (!geometry || (['left', 'right', 'top', 'bottom'] as const).some(side =>
        geometry.bounds[side] !== current!.bounds[side] || geometry.rect[side] !== current!.rect[side])) close(true);
    };
    const onBlur = () => { pointerDown = false; keyboardSelecting = false; close(true); };
    document.addEventListener('selectionchange', schedule);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('contextmenu', onLayoutChange);
    pane.addEventListener('scroll', onLayoutChange, true);
    window.addEventListener('resize', onResize);
    window.addEventListener('blur', onBlur);
    desktop.addEventListener('change', onLayoutChange);
    const resize = new ResizeObserver(onResize);
    resize.observe(pane);
    resize.observe(article);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(focusFrame);
      resize.disconnect();
      document.removeEventListener('selectionchange', schedule);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('contextmenu', onLayoutChange);
      pane.removeEventListener('scroll', onLayoutChange, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('blur', onBlur);
      desktop.removeEventListener('change', onLayoutChange);
    };
  }, [articleRef, menuRef]);

  return selection;
}
