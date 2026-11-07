'use client';
import { useTranslations } from 'next-intl';
import { ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { useSidebar } from '@/components/navigation/sidebar';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { vocabularyCollections, type DictionaryCategory, type VocabularyKind } from '@/lib/vocabulary/collections';

export function VocabularyHeading({ category, collection, locale }: {
  category: DictionaryCategory; collection: VocabularyKind; locale: Locale;
}) {
  const dictionary = vocabularyCollections[collection];
  const t = useTranslations(dictionary.namespace);

  return <header className="vocabulary-heading">
    <DirectoryTrigger collection={collection} />
    <noscript><details className="vocabulary-native-directory"><summary>{t('title')}</summary>
      <nav aria-label={t('title')}>{dictionary.categories.map(group => <div key={group.id}>
        <strong>{t(group.id)}</strong>
        {group.terms.map(([id]) => <a key={id} href={group.id === category.id ? `#${id}` : `${localePath(locale, `${dictionary.path}/${group.id}`)}#${id}`}>{t(`terms.${id}.title`)}</a>)}
      </div>)}</nav>
    </details></noscript>
    <h1>{t(category.id)}</h1>
  </header>;
}

function DirectoryTrigger({ collection }: { collection: VocabularyKind }) {
  const t = useTranslations(vocabularyCollections[collection].namespace);
  const sidebar = useSidebar();
  return <Button variant="ghost" size="icon" className="min-[961px]:hidden" data-slot="mobile-sidebar-trigger"
    aria-label={t('openDirectory')} aria-expanded={sidebar.openMobile} aria-controls={sidebar.mobileDialogId}
    onClick={event => { event.currentTarget.focus(); sidebar.toggleSidebar(); }}>
    <ListIcon size={22} aria-hidden />
  </Button>;
}
