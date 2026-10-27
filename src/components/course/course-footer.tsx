/**
 * [INPUT]: Course learning state with its MDX-derived achievement inventory, translations, and shared Radix menu parts.
 * [OUTPUT]: CourseFooter with a medal progress ring, earned count, and a More menu containing About and language navigation.
 * [POS]: Desktop/mobile sidebar footer; menus stay inside the sheet DOM so touch/focus behavior remains local; language switching reuses the header link policy and has a native no-JavaScript fallback opening downward on mobile and upward in the desktop footer.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DotsThreeIcon } from '@phosphor-icons/react/dist/ssr/DotsThree';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/overlays/dropdown-menu';
import { LanguageSubmenu, LanguageSwitcher } from '@/components/layout/language-switcher';
import { useLearning } from '@/components/progress/progress-provider';
import { localePath } from '@/lib/i18n/routing';
import type { Locale } from '@/lib/i18n/config';
import type { Catalog } from '@/lib/content/model';
import { SidebarFooter } from './sidebar';

export function CourseFooter({ locale, translations }: { locale: Locale; translations: Catalog['translations'] }) {
  const [menuContainer, setMenuContainer] = useState<HTMLDivElement | null>(null);
  const ui = useTranslations('Ui');
  const t = useTranslations('Course');
  const { course, learning, ready } = useLearning();
  const earned = ready ? Object.keys(learning.unlocked).length : 0;
  const total = course.achievements.length;
  const percent = total ? Math.min(100, earned / total * 100) : 0;
  return <SidebarFooter ref={setMenuContainer} className="mt-0 w-full flex-row items-center justify-between gap-4 border-t border-border py-4 pr-4 pl-6 group-data-[collapsible=icon]:hidden">
    <div className="flex min-w-0 items-center gap-3">
      <div role="progressbar" aria-label={t('achievementsTitle')} aria-valuetext={t('achievementCount', { count: earned })}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-busy={!ready}
        className="flex size-10 shrink-0 items-center justify-center rounded-full p-0.5"
        style={{ background: `conic-gradient(var(--color-foreground) ${percent}%, var(--color-border) 0)` }}>
        <span aria-hidden className="flex size-full items-center justify-center rounded-full bg-sidebar text-lg">🥇</span>
      </div>
      <div className="min-w-0 space-y-1">
        <p className="m-0 text-caption leading-copy font-medium text-foreground">{t('achievementsTitle')}</p>
        <p data-achievement-count className="m-0 text-xs leading-snug text-muted-foreground">{t('achievementCount', { count: earned })}</p>
      </div>
    </div>
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
