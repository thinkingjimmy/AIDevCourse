'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Glass } from 'glisse';
import { HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { MedalIcon } from '@phosphor-icons/react/dist/ssr/Medal';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { AchievementGallery } from '@/components/progress/achievement-gallery';
import { useAchievements } from '@/components/progress/achievement-provider';
import type { Catalog } from '@/lib/content/model';
import type { Locale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { author } from '@/lib/site-config';
import { AuthorDialog } from '../author-card';
import { useSidebar } from '../sidebar';
import { ModuleTree } from './module-tree';

export function CourseMobileNavigation({ locale, translations }: { locale: Locale; translations: Catalog['translations'] }) {
  const ui = useTranslations('Ui');
  const course = useTranslations('Course');
  const authorText = useTranslations('Author');
  const { openMobile, mobileDialogId, setOpenMobile } = useSidebar();
  const { ready } = useAchievements();
  return <nav data-slot="mobile-course-navigation" aria-label={ui('navigation')}
    className="mobile-course-navigation fixed inset-x-4 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 mx-auto hidden max-w-96 grid-cols-4 gap-1 rounded-full p-1.5 text-foreground max-[961px]:grid min-[961px]:hidden">
    <Glass aria-hidden data-theme="light" className="mobile-navigation-glass" />
    <Link href={localePath(locale)} className="mobile-navigation-item" aria-label={ui('home')}>
      <HouseIcon size={24} aria-hidden /><span>{ui('home')}</span>
    </Link>
    <button type="button" data-slot="mobile-sidebar-trigger" data-section="contents" className="mobile-navigation-item [@media(scripting:none)]:hidden"
      aria-label={ui('menu')} aria-expanded={openMobile} aria-controls={mobileDialogId} aria-haspopup="dialog"
      onClick={(event) => { event.currentTarget.focus(); setOpenMobile(true); }}>
      <ListIcon size={24} aria-hidden /><span>{course('contentsTab')}</span>
    </button>
    <noscript><details data-slot="mobile-native-menu" className="min-w-0">
      <summary role="button" aria-label={ui('menu')} className="mobile-navigation-item list-none [&::-webkit-details-marker]:hidden">
        <ListIcon size={24} aria-hidden /><span>{course('contentsTab')}</span>
      </summary>
      <div data-slot="mobile-native-panel" className="fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] mx-auto max-h-[70dvh] max-w-160 overflow-y-auto overscroll-contain rounded-3xl bg-sidebar py-3 shadow-xl">
        <p className="m-0 px-6 pt-2 pb-3 text-lg font-semibold">{ui('menu')}</p>
        <ModuleTree staticMode />
        <div className="flex justify-end border-t border-border px-4 pt-2"><LanguageSwitcher locale={locale} translations={translations} side="top" /></div>
      </div>
    </details></noscript>
    <AchievementGallery>
      <button type="button" data-slot="mobile-achievements-trigger" disabled={!ready}
        className="mobile-navigation-item" aria-label={course('achievementsTitle')} title={ready ? undefined : ui('noJs')}>
        <MedalIcon size={24} aria-hidden /><span>{course('achievementsTab')}</span>
      </button>
    </AchievementGallery>
    <AuthorDialog>
      <button type="button" data-slot="mobile-author-trigger" className="mobile-navigation-item [@media(scripting:none)]:hidden" aria-label={authorText('label')}>
        <span aria-hidden className="flex size-6 items-center justify-center text-2xl leading-none">👋</span><span>{ui('aboutTab')}</span>
      </button>
    </AuthorDialog>
    <noscript><a href={author.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={authorText('website')} className="mobile-navigation-item">
      <span aria-hidden className="flex size-6 items-center justify-center text-2xl leading-none">👋</span><span>{ui('aboutTab')}</span>
    </a></noscript>
  </nav>;
}
