/**
 * [INPUT]: Locale and the public catalog version.
 * [OUTPUT]: Zinc header with the aidevcourse mark, the About link, compact search, and 中 / EN.
 * [POS]: Shared by every locale page through the site frame, and by the root 404 bar.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { getCatalog } from '@/lib/content/source';
import { site } from '@/lib/site-config';
import { lessonIndex } from '../search/lessons';
import { LanguageSwitcher } from './language-switcher';
import { SearchTrigger } from '../search/search-trigger';
export function SiteBar({ locale, about, homeLabel, navLabel, children }: {
  locale: string; about: string; homeLabel: string; navLabel: string; children?: ReactNode;
}) {
  return <header className="home-top"><div className="home-inner">
    <Link href={`/${locale}`} className="home-logo" aria-label={`${site.name} · ${homeLabel}`}><span className="home-mark" aria-hidden /><span>aidevcourse</span></Link>
    <nav className="home-nav" aria-label={navLabel}><Link href={`/${locale}/about`}>{about}</Link></nav>
    <div className="home-tools">{children}</div>
  </div></header>;
}
export async function HomeHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'Home' });
  const ui = await getTranslations({ locale, namespace: 'Ui' });
  const catalog = getCatalog();
  return <SiteBar locale={locale} about={ui('about')} homeLabel={ui('home')} navLabel={t('navLabel')}>
    <SearchTrigger locale={locale} version={catalog.version} lessons={lessonIndex(catalog, locale)} compact />
    <LanguageSwitcher locale={locale} translations={catalog.translations} compact />
  </SiteBar>;
}
