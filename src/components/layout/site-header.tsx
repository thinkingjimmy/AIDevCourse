/**
 * [INPUT]: Locale and public translation addresses from the server catalog.
 * [OUTPUT]: Shared site brand, primary-nav.tsx links, language selection, and lazy search entry.
 * [POS]: Persistent site header; no article bodies or extra dictionaries enter the client.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { getCatalog } from '@/lib/content/source';
import { LanguageSwitcher } from './language-switcher';
import { PrimaryNav } from './primary-nav';
import { SearchTrigger } from '../search/search-trigger';
import { site } from '@/lib/site-config';
export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'Ui' });
  const catalog = getCatalog();
  return <header className="site-header"><div className="header-inner">
    <Link href={`/${locale}`} className="brand" aria-label={`${site.name} · ${t('home')}`}><span className="brand-mark" aria-hidden>ai<span>_</span></span><span className="brand-text">Learning AI Coding</span></Link>
    <PrimaryNav locale={locale} />
    <div className="header-tools"><SearchTrigger locale={locale} version={catalog.version} /><LanguageSwitcher locale={locale} translations={catalog.translations} /></div>
  </div></header>;
}
