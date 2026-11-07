'use client';
import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { SidebarInset } from '@/components/navigation/sidebar';
import { Button } from '@/components/ui/button';
import { vocabularyCollections, type DictionaryCategory, type VocabularyKind } from '@/lib/vocabulary/collections';
import { vocabularyPresentation } from '@/lib/vocabulary/presentation';
import type { Locale } from '@/lib/i18n/config';
import { VocabularyDirectory } from './directory';
import { VocabularyHeading } from './directory/heading';
import { useVocabularyNavigation } from './navigation-state';
import { useVocabularyReader } from './reader/use-reader';
import { TermSections } from './term-sections';

export function VocabularyPage({ category, collection = 'design' }: { category: DictionaryCategory; collection?: VocabularyKind }) {
  const locale = useLocale() as Locale;
  return <VocabularyContent key={`${locale}-${collection}-${category.id}`} category={category} collection={collection} locale={locale} />;
}

function VocabularyContent({ category, collection, locale }: {
  category: DictionaryCategory; collection: VocabularyKind; locale: Locale;
}) {
  const { query, onQueryChange } = useVocabularyNavigation();
  const t = useTranslations(vocabularyCollections[collection].namespace);
  const { sections, terms } = useMemo(() => vocabularyPresentation(category, locale), [category, locale]);
  const { pane, sentinel, selected, visible, hasMore, select, showNext } = useVocabularyReader(terms, collection);

  return <>
    <VocabularyDirectory category={category} collection={collection} query={query} onQueryChange={onQueryChange} onSelect={select} />
    <SidebarInset id="main-content" tabIndex={-1} className="min-w-0 overflow-hidden">
      <div className="vocabulary-scroll" ref={pane} data-slot="vocabulary-scroll" tabIndex={0} aria-label={t(category.id)}>
        <VocabularyHeading category={category} collection={collection} locale={locale} />
        <TermSections sections={sections} visible={visible} selected={selected} collection={collection} />
        <div ref={sentinel} className="vocabulary-pagination">
          {hasMore && <Button variant="brand-outline" onClick={showNext}>{t('loadMore')}</Button>}
        </div>
      </div>
    </SidebarInset>
  </>;
}
