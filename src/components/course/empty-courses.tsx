/**
 * [INPUT]: Current locale and real published content in other languages.
 * [OUTPUT]: Empty course library, an about link, and valid alternate-language entries.
 * [POS]: Shared partial-translation experience for home, courses, and unavailable pages.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCatalog } from '@/lib/content/source';
import { languageNames, htmlLanguages, type Locale } from '@/lib/i18n/config';
export async function EmptyCourses({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'Course' });
  const other = [...new Set(getCatalog().courses.map((course) => course.locale))].filter((lang) => lang !== locale);
  return <div className="empty-courses"><h3 className="serif">{t('emptyTitle')}</h3><p>{t('emptyBody')}</p>
    <Link className="button" href={`/${locale}/about`}>{t('aboutSite')}</Link>
    {other.length > 0 && <><p className="small muted">{t('otherLanguages')}</p><div className="alternate-links">{other.map((lang) => <Link key={lang} href={`/${lang}/courses`} lang={htmlLanguages[lang]}>{languageNames[lang]}</Link>)}</div></>}
  </div>;
}
