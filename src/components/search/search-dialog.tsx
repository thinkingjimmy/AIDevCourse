'use client';
import { blogRoot, localePath } from '@/lib/i18n/routing';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/overlays/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { staticClient } from 'fumadocs-core/search/client/orama-static';
import type { SortedResult } from 'fumadocs-core/search';
import { useTranslations } from 'next-intl';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { ArrowElbowDownLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowElbowDownLeft';
import type { Locale } from '@/lib/i18n/config';
import { createSearchDatabase } from '@/lib/search';
import type { SearchLessonMeta } from './lessons';
function Highlight({ text }: { text: string }) {
  return text.split(/(<mark>.*?<\/mark>)/g).map((part, index) => part.startsWith('<mark>') ? <mark className="bg-mark px-px text-foreground" key={index}>{part.slice(6, -7)}</mark> : part);
}
export default function SearchDialog({ locale, version, lessons, onClose, onFocusReturn }: { locale: Locale; version: string; lessons: Record<string, SearchLessonMeta>; onClose: () => void; onFocusReturn: () => void }) {
  const t = useTranslations('Search');
  const ui = useTranslations('Ui');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<SortedResult[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [resultQuery, setResultQuery] = useState('');
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
        setResultQuery(query.trim());
        const coursePrefix = localePath(locale, '/courses/');
        const blogPrefix = localePath(locale, blogRoot);
        setResults(query.trim() ? response.filter(({ url }) =>
          url.startsWith(coursePrefix) || url === blogPrefix || url.startsWith(`${blogPrefix}/`)).slice(0, 10) : []);
        setState('ready');
      } catch { if (!cancelled) { setResultQuery(query.trim()); setResults([]); setState('error'); } }
    }, query ? 100 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [client, query, locale]);
  const status = input.trim() === query.trim() && resultQuery === query.trim() ? state : 'loading';
  const visibleResults = status === 'ready' ? results : [];
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent aria-describedby="search-description" onCloseAutoFocus={(event) => { event.preventDefault(); onFocusReturn(); }}>
      <DialogTitle className="sr-only">{t('open')}</DialogTitle>
      <div className="flex min-h-14 items-center gap-3 border-b border-border px-4 text-muted-foreground"><MagnifyingGlassIcon size={20} aria-hidden /><Input className="h-auto min-h-10 w-auto flex-1 rounded-none border-0 bg-transparent p-0 text-base leading-[inherit] text-foreground shadow-none focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-0 md:text-base" autoComplete="off" value={input} aria-label={t('open')} placeholder={t('placeholder')} aria-controls="search-results"
        onCompositionStart={() => { composing.current = true; }} onCompositionEnd={(event) => { composing.current = false; setQuery(event.currentTarget.value); setActive(0); }}
        onChange={(event) => { setInput(event.target.value); setActive(0); if (!composing.current) setQuery(event.target.value); }}
        onKeyDown={(event) => {
          if (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const next = Math.max(0, Math.min(visibleResults.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1))); setActive(next); if (visibleResults[next]) links.current[next]?.scrollIntoView({ block: 'nearest' }); }
          if (event.key === 'Enter' && visibleResults[active]) { event.preventDefault(); links.current[active]?.click(); }
        }} /><DialogClose asChild><Button variant="keyboard" size="keyboard" aria-label={ui('close')}>Esc</Button></DialogClose></div>
      <DialogDescription id="search-description" className="sr-only">{t('hint')}</DialogDescription>
      <div className="flex max-h-[50vh] flex-col gap-0.5 overflow-auto p-2" id="search-results" aria-label={t('results')}>
        <p role="status" className="px-3 py-2 text-sm text-muted-foreground empty:hidden">{status === 'loading' ? t('loading') : status === 'error' ? t('error') : query && !visibleResults.length ? t('empty') : ''}</p>
        {status === 'error' && <Button variant="paper" size="paper" onClick={() => setAttempt((value) => value + 1)}>{t('retry')}</Button>}
        {visibleResults.map((result, index) => {
          const meta = lessons[result.url.split('#')[0]];
          const title = result.type === 'page' ? result.content : (meta?.title ?? result.content);
          return <Link key={`${result.id}-${index}`} ref={(element) => { links.current[index] = element; }} href={result.url} onClick={onClose} className="search-result group/result grid grid-cols-[36px_minmax(0,1fr)_20px] items-center gap-2 rounded-lg p-3 no-underline hover:bg-surface data-[selected=true]:bg-surface" data-selected={active === index} onFocus={() => setActive(index)}>
            <span className="font-mono text-xs text-faint">{meta?.number ?? ''}</span>
            <span className="min-w-0"><span className="block text-ui font-medium [overflow-wrap:anywhere]"><Highlight text={title} /></span>{meta ? <small className="mt-0.5 block font-mono text-xs text-faint">{meta.module}</small> : null}</span>
            <ArrowElbowDownLeftIcon size={16} className="invisible text-faint group-data-[selected=true]/result:visible" aria-hidden />
          </Link>;
        })}
      </div><p className="m-0 border-t border-border px-4 py-3 font-mono text-xs text-muted-foreground">{t('keys')}</p>
    </DialogContent></Dialog>;
}
