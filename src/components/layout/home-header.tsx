/**
 * [INPUT]: Locale, the public catalog version, and whether the bar sits on the wide course frame.
 * [OUTPUT]: Zinc header with the aidevcourse mark, the 更新 link, compact search, and 中 / EN.
 * [POS]: Shared by the homepage and every course or lesson page.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { getCatalog } from '@/lib/content/source';
import { site } from '@/lib/site-config';
import { LanguageSwitcher } from './language-switcher';
import { SearchTrigger } from '../search/search-trigger';
export async function HomeHeader({ locale, wide = false }: { locale: Locale; wide?: boolean }) {
  const t = await getTranslations({ locale, namespace: 'Home' });
  const ui = await getTranslations({ locale, namespace: 'Ui' });
  const catalog = getCatalog();
  return <header className={wide ? 'home-top learn-top' : 'home-top'}><div className="home-inner">
    <Link href={`/${locale}`} className="home-logo" aria-label={`${site.name} · ${ui('home')}`}><span className="home-mark" aria-hidden /><span>aidevcourse</span></Link>
    <nav className="home-nav" aria-label={t('navLabel')}><Link href={`/${locale}/about`}>{t('navUpdates')}</Link></nav>
    <div className="home-tools"><SearchTrigger locale={locale} version={catalog.version} compact /><LanguageSwitcher locale={locale} translations={catalog.translations} compact /></div>
  </div></header>;
}
