'use client';
import { useState } from 'react';
import { LanguageMenu, LanguageSwitcher } from '@/components/layout/language-switcher';
import type { Locale } from '@/lib/i18n/config';
import type { Catalog } from '@/lib/content/model';
import { SidebarFooter } from './sidebar';
import { AchievementGallery } from '@/components/progress/achievement-gallery';
import { AuthorDialog } from './author-card';

export function CourseFooter({ locale, translations }: { locale: Locale; translations: Catalog['translations'] }) {
  const [menuContainer, setMenuContainer] = useState<HTMLDivElement | null>(null);
  return <SidebarFooter ref={setMenuContainer} className="mt-0 w-full flex-row items-center justify-between gap-2 border-t border-border p-2 max-[961px]:px-4 max-[961px]:pb-[max(0.75rem,env(safe-area-inset-bottom))] group-data-[collapsible=icon]:mt-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
    <AchievementGallery />
    <div className="flex shrink-0 items-center gap-2 group-data-[collapsible=icon]:hidden">
      <AuthorDialog />
      <LanguageMenu locale={locale} translations={translations} container={menuContainer} />
      <noscript><div className="flex shrink-0 items-center gap-2 max-[961px]:[&_.language-options]:top-[calc(100%+10px)] max-[961px]:[&_.language-options]:bottom-auto">
        <LanguageSwitcher locale={locale} translations={translations} side="top" />
      </div></noscript>
    </div>
  </SidebarFooter>;
}
