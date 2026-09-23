/**
 * [INPUT]: Current locale and the public content build version.
 * [OUTPUT]: Accessible search entry and Cmd/Ctrl+K shortcut.
 * [POS]: Lightweight header control; the search engine loads only after opening.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import type { Locale } from '@/lib/i18n/config';
const SearchDialog = dynamic(() => import('./search-dialog'), { ssr: false });
export function SearchTrigger({ locale, version }: { locale: Locale; version: string }) {
  const t = useTranslations('Search');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !event.isComposing) { event.preventDefault(); setOpen((value) => !value); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);
  return <><button ref={ref} className="search-trigger" aria-label={t('open')} aria-keyshortcuts="Meta+K Control+K" onClick={() => setOpen(true)}><Search size={16} aria-hidden /><span>{t('open')}…</span><kbd>⌘K</kbd></button>
    {open && <SearchDialog key={locale} locale={locale} version={version} onClose={() => { setOpen(false); ref.current?.focus(); }} />}</>;
}
