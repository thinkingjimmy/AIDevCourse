'use client';
import type { MouseEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { DirectoryLink, DirectoryNavigation, directoryStyles } from '@/components/navigation/directory-presentation';
import {
  SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubItem,
} from '@/components/navigation/sidebar';
import type { Locale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';
import { vocabularyCollections, vocabularyTermPath, type DictionaryTermId, type DictionaryCategory, type VocabularyKind } from '@/lib/vocabulary/collections';

export function VocabularyDirectoryContents({ category: activeCategory, collection, query, onSelect, selected }: {
  category: DictionaryCategory; collection: VocabularyKind; query: string; onSelect?: (id: DictionaryTermId) => void; selected?: DictionaryTermId;
}) {
  const dictionary = vocabularyCollections[collection];
  const categories = dictionary.categories;
  const t = useTranslations(dictionary.namespace);
  const locale = useLocale() as Locale;
  const normalized = query.trim().normalize('NFKC').toLocaleLowerCase();
  const matches = categories.flatMap((category, categoryIndex) =>
    category.terms.map(([id, english], index) => ({ id, english, index, categoryIndex })))
    .filter(term => `${t(`terms.${term.id}.title`)} ${term.english} ${term.id}`.normalize('NFKC').toLocaleLowerCase().includes(normalized));

  const select = (event: MouseEvent<HTMLAnchorElement>, id: DictionaryTermId) => {
    if (!onSelect || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onSelect(id);
  };
  const termLink = (id: DictionaryTermId, index: number, categoryIndex: number) => {
    const category = categories[categoryIndex];
    const current = collection !== 'programming' && category.id === activeCategory.id;
    return <DirectoryLink href={current ? `#${id}` : localePath(locale, vocabularyTermPath(collection, category.id, id))}
      label={t(`terms.${id}.title`)} number={`${categoryIndex + 1}.${index + 1}`} announceNumber={false} isActive={selected === id}
      prefetch={false} onClick={event => { if (current || selected === id) select(event, id); }} />;
  };

  return <SidebarContent className="w-full group-data-[collapsible=icon]:hidden">
    <SidebarGroup className={directoryStyles.group}>
      <DirectoryNavigation label={t('title')}>
        {normalized ? <>
          <p className="px-3 pb-2 text-caption text-sidebar-foreground" role="status">{t('resultsCount', { count: matches.length })}</p>
          <SidebarMenu>{matches.map(term => <SidebarMenuItem key={term.id}>{termLink(term.id, term.index, term.categoryIndex)}</SidebarMenuItem>)}</SidebarMenu>
          {!matches.length && <p className="px-3 py-4 text-sm text-sidebar-foreground">{t('noResults')}</p>}
        </> : categories.map((category, categoryIndex) => <SidebarMenu className="gap-0" key={category.id}><SidebarMenuItem>
          <details open={category.id === activeCategory.id} className="vocabulary-category">
            <summary className={cn(directoryStyles.category, 'flex cursor-pointer list-none')}>
              <span className={directoryStyles.categoryNumber} aria-hidden>{String(categoryIndex + 1).padStart(2, '0')}</span>
              <span className="min-w-0">{t(category.id)}<CaretDownIcon size={14} aria-hidden className={directoryStyles.caret} /></span>
            </summary>
            <SidebarMenuSub className={directoryStyles.submenu}>
              {category.terms.map(([id], index) => <SidebarMenuSubItem key={id}>{termLink(id, index, categoryIndex)}</SidebarMenuSubItem>)}
            </SidebarMenuSub>
          </details>
        </SidebarMenuItem></SidebarMenu>)}
      </DirectoryNavigation>
    </SidebarGroup>
  </SidebarContent>;
}
