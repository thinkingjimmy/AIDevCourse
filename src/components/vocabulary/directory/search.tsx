'use client';
import { useId, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { vocabularyCollections, type VocabularyKind } from '@/lib/vocabulary/collections';

const subscribeToHydration = () => () => {};

export function VocabularySearch({ collection, query, onQueryChange }: {
  collection: VocabularyKind; query: string; onQueryChange: (query: string) => void;
}) {
  const t = useTranslations(vocabularyCollections[collection].namespace);
  const inputId = useId();
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  return <div className="vocabulary-search group-data-[collapsible=icon]:hidden">
    <label htmlFor={inputId} className="sr-only">{t('search')}</label>
    <MagnifyingGlassIcon size={17} aria-hidden />
    <Input id={inputId} type="search" placeholder={t('searchPlaceholder')} value={query} autoComplete="off" disabled={!ready}
      onChange={event => onQueryChange(event.currentTarget.value)} />
    {query && <Button variant="ghost" size="icon" aria-label={t('clearSearch')} onClick={() => onQueryChange('')}><XIcon size={16} aria-hidden /></Button>}
  </div>;
}
