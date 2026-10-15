/**
 * [INPUT]: Current language translation context and published courses in other languages.
 * [OUTPUT]: Localized unavailable page inside the zinc frame, linking to the AI 101 course.
 * [POS]: Missing-route boundary within a valid locale.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { getLocale, getTranslations } from 'next-intl/server';
import { getCatalog } from '@/lib/content/source';
import { htmlLanguages, languageNames, locales, type Locale } from '@/lib/i18n/config';
import { MissingPage } from '@/components/layout/missing-page';
export default async function NotFound() {
  const locale = await getLocale() as Locale;
  const t = await getTranslations('Ui');
  const courseCopy = await getTranslations('Course');
  const catalog = getCatalog();
  const course = catalog.courses.find((item) => item.locale === locale && item.slug === 'ai-101');
  const languages = locales.filter((lang) => lang !== locale).map((lang) => {
    const alternate = catalog.courses.find((item) => item.locale === lang && item.slug === 'ai-101') ?? catalog.courses.find((item) => item.locale === lang);
    return { href: alternate?.url ?? `/${lang}`, lang: htmlLanguages[lang], label: languageNames[lang] };
  });
  return <MissingPage title={t('notFoundTitle')} body={t('notFoundBody')} primaryHref={course?.url ?? `/${locale}/courses/ai-101`} primaryLabel={course?.title ?? 'AI 101'} homeHref={`/${locale}`} homeLabel={t('backHome')} languagesLabel={courseCopy('otherLanguages')} languages={languages} />;
}
