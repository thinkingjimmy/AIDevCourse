/**
 * [INPUT]: Locale and the public catalog version.
 * [OUTPUT]: Zinc header with the aidevcourse mark, About link, globe menu, and keyboard-only search.
 * [POS]: Shared by every locale page through the site frame, and by the root 404 bar.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
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
  locale: string; about: string; homeLabel: string; navLabel: string; children?: ReactNode;
}) {
  return <header className="sticky top-0 z-40 h-(--zinc-header) border-b border-border bg-background backdrop-blur-[8px] max-[721px]:h-auto max-[721px]:min-h-(--zinc-header)"><PageContainer className="flex h-full items-center gap-7 max-[721px]:h-auto max-[721px]:min-h-14 max-[721px]:flex-wrap max-[721px]:gap-x-4 max-[721px]:gap-y-2.5 max-[721px]:py-3">
    <SiteLogo href={`/${locale}`} aria-label={`${site.name} · ${homeLabel}`} />
    <nav className="flex min-w-0 items-center gap-5 text-[14px] text-muted-foreground max-[721px]:order-3 max-[721px]:basis-full" aria-label={navLabel}><Link className="text-muted-foreground no-underline hover:text-foreground" href={`/${locale}/about`}>{about}</Link></nav>
    <div className="ml-auto flex items-center gap-2.5 text-[13px] text-muted-foreground">{children}</div>
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
