/**
 * [INPUT]: Current language translation context and actual alternate courses.
 * [OUTPUT]: Localized unavailable-page explanation without false article metadata.
 * [POS]: Missing-route boundary within a valid locale.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getCatalog } from '@/lib/content/source';
import { htmlLanguages, languageNames, type Locale } from '@/lib/i18n/config';
export default async function NotFound() {
  const locale = await getLocale() as Locale;
  const t = await getTranslations('Ui');
  return <main id="main-content" className="not-found" tabIndex={-1}><p className="eyebrow">404</p><h1>{t('notFoundTitle')}</h1><p>{t('notFoundBody')}</p><Link className="button primary" href={`/${locale}/courses`}>{t('courses')}</Link><div className="alternate-links">{getCatalog().courses.filter((course) => course.locale !== locale).map((course) => <Link key={course.url} href={course.url} lang={htmlLanguages[course.locale]}>{languageNames[course.locale]} · {course.title}</Link>)}</div></main>;
}
