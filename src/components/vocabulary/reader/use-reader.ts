'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { isDictionaryTerm, type DictionaryTerm, type DictionaryTermId, type VocabularyKind } from '@/lib/vocabulary/collections';

const batchSize = 6;
const readingOffset = 24;

type NavigationTarget = { id: DictionaryTermId; focus: boolean };
type AppendAnchor = { id: string; offset: number; navigation: NavigationTarget | undefined };

export function useVocabularyReader(terms: readonly DictionaryTerm[], collection: VocabularyKind) {
  const [selected, setSelected] = useState<DictionaryTermId>(terms[0][0]);
  const [count, setCount] = useState(batchSize);
  const [target, setTarget] = useState<NavigationTarget>();
  const pane = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const handledTarget = useRef<NavigationTarget>(undefined);
  const appendAnchor = useRef<AppendAnchor>(undefined);
  const total = terms.length;

  const loadMore = useCallback(() => {
    const root = pane.current;
    if (root && !appendAnchor.current) {
      const top = root.getBoundingClientRect().top;
      const anchor = [...root.querySelectorAll<HTMLElement>('.vocabulary-term')]
        .find(card => card.getBoundingClientRect().bottom > top + readingOffset);
      if (anchor) {
        appendAnchor.current = {
          id: anchor.id, offset: anchor.getBoundingClientRect().top - top, navigation: handledTarget.current,
        };
      }
    }
    setCount(value => Math.min(value + batchSize, total));
  }, [total]);

  const reveal = useCallback((id: DictionaryTermId, focus: boolean) => {
    const index = terms.findIndex(term => term[0] === id);
    if (index < 0) return;
    appendAnchor.current = undefined;
    setCount(value => Math.min(total, Math.max(value, Math.ceil((index + 1) / batchSize) * batchSize)));
    setSelected(id);
    setTarget({ id, focus });
  }, [terms, total]);

  useEffect(() => {
    const navigate = () => {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      if (isDictionaryTerm(id, collection)) reveal(id, false);
      else if (!id) reveal(terms[0][0], false);
    };
    navigate();
    window.addEventListener('hashchange', navigate);
    window.addEventListener('popstate', navigate);
    return () => {
      window.removeEventListener('hashchange', navigate);
      window.removeEventListener('popstate', navigate);
    };
  }, [terms, collection, reveal]);

  useLayoutEffect(() => {
    if (!target || handledTarget.current === target || !pane.current) return;
    const card = document.getElementById(target.id);
    if (!card) return;
    const root = pane.current;
    const top = target.id === terms[0][0] ? 0
      : root.scrollTop + card.getBoundingClientRect().top - root.getBoundingClientRect().top - readingOffset;
    root.scrollTo({ top, behavior: 'instant' });
    if (target.focus) card.focus({ preventScroll: true });
    handledTarget.current = target;
  }, [target, count, terms]);

  useLayoutEffect(() => {
    const anchor = appendAnchor.current;
    appendAnchor.current = undefined;
    if (!anchor || anchor.navigation !== handledTarget.current || !pane.current) return;
    const card = document.getElementById(anchor.id);
    if (!card) return;
    // Appending a row can extend an earlier section above the reader's current card.
    const root = pane.current;
    root.scrollTop += card.getBoundingClientRect().top - root.getBoundingClientRect().top - anchor.offset;
  }, [count]);

  useEffect(() => {
    const root = pane.current;
    if (!root || !sentinel.current || count >= total || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMore();
    }, { root, rootMargin: '0px 0px 200px 0px' });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [count, total, loadMore]);

  const select = useCallback((id: DictionaryTermId) => {
    if (window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`);
    reveal(id, true);
  }, [reveal]);

  const showNext = useCallback(() => {
    const next = terms[count];
    if (next) reveal(next[0], true);
  }, [terms, count, reveal]);

  const visible = useMemo(() => new Set(terms.slice(0, count).map(([id]) => id)), [terms, count]);
  return { pane, sentinel, selected, visible, hasMore: count < total, select, showNext };
}
