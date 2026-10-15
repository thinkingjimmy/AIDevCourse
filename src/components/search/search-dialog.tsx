/**
 * [INPUT]: One locale's Fumadocs static export and a user query.
 * [OUTPUT]: Lazy, race-safe search with keyboard/IME support, lesson meta, and retries.
 * [POS]: Isolated dialog boundary; cache URLs include locale and build version.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { staticClient } from 'fumadocs-core/search/client/orama-static';
import type { SortedResult } from 'fumadocs-core/search';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import type { Locale } from '@/lib/i18n/config';
import { createSearchDatabase } from '@/lib/search/tokenizer';
import type { SearchLessonMeta } from './lessons';
function Highlight({ text }: { text: string }) {
  return text.split(/(<mark>.*?<\/mark>)/g).map((part, index) => part.startsWith('<mark>') ? <mark key={index}>{part.slice(6, -7)}</mark> : part);
}
export default function SearchDialog({ locale, version, lessons, onClose }: { locale: Locale; version: string; lessons: Record<string, SearchLessonMeta>; onClose: () => void }) {
  const t = useTranslations('Search');
  const ui = useTranslations('Ui');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<SortedResult[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [active, setActive] = useState(0);
  const composing = useRef(false);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const client = useMemo(() => staticClient({ from: `/api/search/${locale}?v=${version}&retry=${attempt}`, initDB: createSearchDatabase }), [locale, version, attempt]);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setState('loading');
      try {
        const response = await client.search(query.trim());
        if (cancelled) return;
        setResults(query.trim() ? response.filter((result) => result.url.startsWith(`/${locale}/courses/`)).slice(0, 10) : []);
        setState('ready');
      } catch { if (!cancelled) { setResults([]); setState('error'); } }
    }, query ? 100 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [client, query, locale]);
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}><Dialog.Portal>
    <Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="search-dialog" aria-describedby="search-description" onCloseAutoFocus={(event) => event.preventDefault()}>
      <Dialog.Title className="sr-only">{t('open')}</Dialog.Title>
      <div className="search-input-row"><Search size={20} aria-hidden /><input autoComplete="off" autoFocus value={input} aria-label={t('open')} placeholder={t('placeholder')} aria-controls="search-results"
        onCompositionStart={() => { composing.current = true; }} onCompositionEnd={(event) => { composing.current = false; setQuery(event.currentTarget.value); setActive(0); }}
        onChange={(event) => { setInput(event.target.value); setActive(0); if (!composing.current) setQuery(event.target.value); }}
        onKeyDown={(event) => {
          if (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const next = Math.max(0, Math.min(results.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1))); setActive(next); links.current[next]?.scrollIntoView({ block: 'nearest' }); }
          if (event.key === 'Enter' && state === 'ready' && results[active]) { event.preventDefault(); links.current[active]?.click(); }
        }} /><Dialog.Close className="search-esc" aria-label={ui('close')}>Esc</Dialog.Close></div>
      <Dialog.Description id="search-description" className="sr-only">{t('hint')}</Dialog.Description>
      <div className="search-results" id="search-results" aria-label={t('results')}>
        <p role="status" className="search-status">{state === 'loading' ? t('loading') : state === 'error' ? t('error') : query && !results.length ? t('empty') : ''}</p>
        {state === 'error' && <button className="button" onClick={() => setAttempt((value) => value + 1)}>{t('retry')}</button>}
        {state === 'ready' && results.map((result, index) => {
          const meta = lessons[result.url.split('#')[0]];
          const title = result.type === 'page' ? result.content : (meta?.title ?? result.content);
          return <Link key={`${result.id}-${index}`} ref={(element) => { links.current[index] = element; }} href={result.url} onClick={onClose} className="search-result" data-selected={active === index} onFocus={() => setActive(index)}>
            <span className="search-num">{meta?.number ?? ''}</span>
            <span className="search-copy"><span className="search-title"><Highlight text={title} /></span>{meta ? <small>{meta.module} · {ui('minutes', { count: meta.minutes })}</small> : null}</span>
            <span className="search-go" aria-hidden="true">↵</span>
          </Link>;
        })}
      </div><p className="search-keys">{t('keys')}</p>
    </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
