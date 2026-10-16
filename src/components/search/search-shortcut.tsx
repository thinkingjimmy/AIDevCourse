/**
 * [INPUT]: Current locale, public content version, and lesson search metadata.
 * [OUTPUT]: Cmd/Ctrl+K search with focus restoration and no visible entry control.
 * [POS]: Shared keyboard controller; the search engine loads only after opening.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Locale } from '@/lib/i18n/config';
import type { SearchLessonMeta } from './lessons';
const SearchDialog = dynamic(() => import('./search-dialog'), { ssr: false });
export function SearchShortcut({ locale, version, lessons }: { locale: Locale; version: string; lessons: Record<string, SearchLessonMeta> }) {
  const [open, setOpen] = useState(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  useEffect(() => {
    if (!open && previousFocus.current?.isConnected) previousFocus.current.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') || event.isComposing) return;
      event.preventDefault();
      if (open) close();
      else {
        previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [close, open]);
  return open ? <SearchDialog key={locale} locale={locale} version={version} lessons={lessons} onClose={close} /> : null;
}
