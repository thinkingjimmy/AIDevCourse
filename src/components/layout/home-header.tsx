import { localePath } from '@/lib/i18n/routing';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { PageContainer, SiteLogo } from './page-primitives';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { getCatalog } from '@/lib/content/source';
import { site } from '@/lib/site-config';
import { lessonIndex } from '../search/lessons';
import { LanguageSwitcher } from './language-switcher';
import { SearchShortcut } from '../search/search-shortcut';
export function SiteBar({ locale, about, homeLabel, navLabel, children }: {
  locale: Locale; about: string; homeLabel: string; navLabel: string; children?: ReactNode;
}) {
  return <header className="sticky top-0 z-40 h-(--zinc-header) border-b border-border bg-background backdrop-blur-[8px]"><PageContainer className="flex h-full items-center gap-7 max-[721px]:gap-4">
    <SiteLogo href={localePath(locale)} aria-label={`${site.name} · ${homeLabel}`} />
    <div className="ml-auto flex min-w-0 items-center gap-5 max-[721px]:gap-2.5">
      <nav className="min-w-0 text-sm text-muted-foreground" aria-label={navLabel}><Link className="text-muted-foreground no-underline hover:text-foreground" href={localePath(locale, '/about')}>{about}</Link></nav>
      <div className="flex shrink-0 items-center gap-2.5 text-caption text-muted-foreground">{children}</div>
    </div>
  </PageContainer></header>;
}
export async function HomeHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'Home' });
  const ui = await getTranslations({ locale, namespace: 'Ui' });
  const catalog = getCatalog();
  return <SiteBar locale={locale} about={ui('about')} homeLabel={ui('home')} navLabel={t('navLabel')}>
    <SearchShortcut locale={locale} version={catalog.version} lessons={lessonIndex(catalog, locale)} />
    <LanguageSwitcher locale={locale} translations={catalog.translations} />
  </SiteBar>;
}
