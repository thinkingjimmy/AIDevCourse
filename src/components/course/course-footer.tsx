'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DotsThreeIcon } from '@phosphor-icons/react/dist/ssr/DotsThree';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/overlays/dropdown-menu';
import { LanguageSubmenu, LanguageSwitcher } from '@/components/layout/language-switcher';
import { localePath } from '@/lib/i18n/routing';
import type { Locale } from '@/lib/i18n/config';
import type { Catalog } from '@/lib/content/model';
import { SidebarFooter } from './sidebar';
import { AchievementGallery } from '@/components/progress/achievement-gallery';

export function CourseFooter({ locale, translations }: { locale: Locale; translations: Catalog['translations'] }) {
  const [menuContainer, setMenuContainer] = useState<HTMLDivElement | null>(null);
  const ui = useTranslations('Ui');
  return <SidebarFooter ref={setMenuContainer} className="mt-0 w-full flex-row items-center justify-between gap-2 border-t border-border p-2 group-data-[collapsible=icon]:hidden">
    <AchievementGallery />
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={ui('more')} className="size-11 shrink-0 text-muted-foreground [@media(scripting:none)]:hidden">
          <DotsThreeIcon size={22} weight="bold" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent container={menuContainer} side="top" align="end" collisionPadding={12} aria-label={ui('more')}>
        <DropdownMenuItem asChild><Link href={localePath(locale, '/about')}><InfoIcon size={18} aria-hidden />{ui('about')}</Link></DropdownMenuItem>
        <LanguageSubmenu locale={locale} translations={translations} container={menuContainer} />
      </DropdownMenuContent>
    </DropdownMenu>
    <noscript><div className="flex shrink-0 items-center gap-2 max-[961px]:[&_.language-options]:top-[calc(100%+10px)] max-[961px]:[&_.language-options]:bottom-auto">
      <Link href={localePath(locale, '/about')} className="text-sm text-muted-foreground">{ui('about')}</Link>
      <LanguageSwitcher locale={locale} translations={translations} side="top" />
    </div></noscript>
  </SidebarFooter>;
}
