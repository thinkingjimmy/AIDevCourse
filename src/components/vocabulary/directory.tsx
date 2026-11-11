'use client';
import { useTranslations } from 'next-intl';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DirectoryHeader, directoryStyles } from '@/components/navigation/directory-presentation';
import { Sidebar, useSidebar } from '@/components/navigation/sidebar';
import { vocabularyCollections, type DictionaryTermId, type DictionaryCategory, type VocabularyKind } from '@/lib/vocabulary/collections';
import { VocabularyDirectoryContents } from './directory/contents';
import { VocabularySearch } from './directory/search';

export function VocabularyDirectory({ category, collection, query, onQueryChange, onSelect, selected }: {
  category: DictionaryCategory; collection: VocabularyKind;
  query: string; onQueryChange: (query: string) => void; onSelect?: (id: DictionaryTermId) => void; selected?: DictionaryTermId;
}) {
  const dictionary = vocabularyCollections[collection];
  const t = useTranslations(dictionary.namespace);
  const { open, isMobile } = useSidebar();

  return <Sidebar label={t('title')}>
    <DirectoryHeader toggleLabel={t(open || isMobile ? 'closeDirectory' : 'openDirectory')}
      title={<div className={cn('flex min-w-0 flex-1 items-center', !isMobile && 'group-data-[collapsible=icon]:hidden')}>
        <p className={isMobile ? 'm-0 min-w-0 text-xl font-semibold' : cn(directoryStyles.title, 'm-0 pr-0')}>{t('title')}</p>
        <Button asChild variant="ghost" size="icon-touch" className="shrink-0 text-sidebar-foreground">
          <a href={dictionary.source} target="_blank" rel="noreferrer" aria-label={t('source')} title={t('source')}>
            <InfoIcon size={18} aria-hidden />
          </a>
        </Button>
      </div>}>
      <VocabularySearch collection={collection} query={query} onQueryChange={onQueryChange} />
    </DirectoryHeader>
    <VocabularyDirectoryContents category={category} collection={collection} query={query} onSelect={onSelect} selected={selected} />
  </Sidebar>;
}
