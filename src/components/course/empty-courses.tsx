/**
 * [INPUT]: Current locale and real published content in other languages.
 * [OUTPUT]: Empty course library, an about link, and links to courses published in other languages.
 * [POS]: Homepage state when the active language has no published course.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCatalog } from '@/lib/content/source';
import { languageNames, htmlLanguages, type Locale } from '@/lib/i18n/config';
export async function EmptyCourses({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'Course' });
  const others = getCatalog().courses.filter((course) => course.locale !== locale);
  return <div className="empty-courses"><h3>{t('emptyTitle')}</h3><p>{t('emptyBody')}</p>
    <Link className="button" href={`/${locale}/about`}>{t('aboutSite')}</Link>
    {others.length > 0 && <><p className="small muted">{t('otherLanguages')}</p><div className="alternate-links">{others.map((course) => <Link key={course.url} href={course.url} lang={htmlLanguages[course.locale]}>{languageNames[course.locale]}</Link>)}</div></>}
  </div>;
}
