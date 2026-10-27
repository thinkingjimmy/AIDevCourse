/**
 * [INPUT]: Current language translation context and published courses in other languages, canonical locale paths.
 * [OUTPUT]: Localized unavailable page inside the zinc frame, linking to an available course or home.
 * [POS]: Missing-route boundary within a valid locale.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { localePath } from '@/lib/i18n/routing';
import { getLocale, getTranslations } from 'next-intl/server';
import { getCatalog } from '@/lib/content/source';
import { htmlLanguages, languageNames, locales, type Locale } from '@/lib/i18n/config';
import { MissingPage } from '@/components/layout/missing-page';
export default async function NotFound() {
  const locale = await getLocale() as Locale;
  const t = await getTranslations('Ui');
  const courseCopy = await getTranslations('Course');
  const catalog = getCatalog();
  const course = catalog.courses.find((item) => item.locale === locale);
  const languages = locales.filter((lang) => lang !== locale).map((lang) => {
    const alternate = catalog.courses.find((item) => item.locale === lang);
    return { href: alternate?.url ?? localePath(lang), lang: htmlLanguages[lang], label: languageNames[lang] };
  });
  return <MissingPage title={t('notFoundTitle')} body={t('notFoundBody')} primaryHref={course?.url ?? localePath(locale)} primaryLabel={course?.title ?? t('backHome')} homeHref={localePath(locale)} homeLabel={t('backHome')} languagesLabel={courseCopy('otherLanguages')} languages={languages} />;
}
