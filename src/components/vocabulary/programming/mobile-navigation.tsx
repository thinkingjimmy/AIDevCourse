'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/navigation/sidebar';
import type { Locale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { programmingCategories } from '@/lib/vocabulary/programming';
import { vocabularyTermPath } from '@/lib/vocabulary/collections';

export function ProgrammingMobileNavigation() {
  const t = useTranslations('ProgrammingVocabulary');
  const locale = useLocale() as Locale;
  const { openMobile, mobileDialogId, setOpenMobile } = useSidebar();
  return <div className="fixed inset-x-5 bottom-[calc(16px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-64 justify-center min-[961px]:hidden">
    <Button variant="brand-outline" className="min-h-12 rounded-full bg-background px-5 shadow-md [@media(scripting:none)]:hidden"
      data-slot="mobile-sidebar-trigger" aria-label={t('openDirectory')} aria-expanded={openMobile} aria-controls={mobileDialogId} aria-haspopup="dialog"
      onClick={event => { event.currentTarget.focus(); setOpenMobile(true); }}>
      <ListIcon size={20} aria-hidden />{t('directory')}
    </Button>
    <noscript><details className="programming-native-directory">
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 rounded-full border border-brand bg-background px-5 text-sm font-medium text-brand shadow-md">
        <ListIcon size={20} aria-hidden />{t('directory')}
      </summary>
      <nav aria-label={t('title')} className="absolute inset-x-0 bottom-[calc(100%+12px)] max-h-[60dvh] overflow-y-auto rounded-sm border border-border bg-background p-3 shadow-md">
        {programmingCategories.map(category => <div key={category.id}>
          <p className="m-0 px-3 py-2 text-sm font-semibold">{t(category.id)}</p>
          {category.terms.map(([id]) => <a key={id} href={localePath(locale, vocabularyTermPath('programming', category.id, id))}
            className="flex min-h-11 items-center px-3 py-2 text-sm text-brand no-underline">{t(`terms.${id}.title`)}</a>)}
        </div>)}
      </nav>
    </details></noscript>
  </div>;
}
