/**
 * [INPUT]: An explicit locale, localized dictionaries, the public course catalog, and shared title/action primitives.
 * [OUTPUT]: The single 404 page with Geist Pixel headings, homepage Hero buttons, and valid course/home/language recovery links.
 * [POS]: Owns 404 presentation and recovery data for both locale and root error documents.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { getCatalog } from '@/lib/content/source';
import { htmlLanguages, languageNames, locales, type Locale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { Button } from '@/components/ui/button';
import { StatusPage, PageTitle, PageEyebrow, PageActions } from './page-primitives';
export async function MissingPage({ locale }: { locale: Locale }) {
  const ui = await getTranslations({ locale, namespace: 'Ui' });
  const courseCopy = await getTranslations({ locale, namespace: 'Course' });
  const catalog = getCatalog();
  const course = catalog.courses.find((item) => item.locale === locale);
  const homeHref = localePath(locale);
  const languages = locales.filter((lang) => lang !== locale).map((lang) => {
    const alternate = catalog.courses.find((item) => item.locale === lang);
    return { href: alternate?.url ?? localePath(lang), lang: htmlLanguages[lang], label: languageNames[lang] };
  });
  return <StatusPage id="main-content" className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] content-center items-center gap-8 max-[721px]:grid-cols-1" tabIndex={-1}>
    <div>
      <PageEyebrow>404</PageEyebrow>
      <PageTitle className="font-pixel font-normal text-balance">{ui('notFoundTitle')}</PageTitle>
      <p className="m-0 mb-7 max-w-[40rem] text-base leading-body text-muted-foreground">{ui('notFoundBody')}</p>
      <PageActions>
        {course && <Button asChild variant="action-raised" size="action"><Link href={course.url}>{course.title}<ArrowRightIcon size={16} aria-hidden /></Link></Button>}
        <Button asChild variant="action-raised" size="action"><Link href={homeHref}>{ui('backHome')}<ArrowRightIcon size={16} aria-hidden /></Link></Button>
      </PageActions>
      <nav className="mt-7 flex flex-wrap gap-x-[18px] gap-y-2 font-mono text-xs text-muted-foreground" aria-label={courseCopy('otherLanguages')}>{languages.map((language) => <Link className="text-inherit no-underline hover:text-foreground" key={language.href} href={language.href} lang={language.lang}>{language.label}</Link>)}</nav>
    </div>
    <p className="m-0 justify-self-end font-pixel text-error leading-none font-normal tracking-tighter text-muted select-none max-[721px]:justify-self-start max-[721px]:text-8xl" aria-hidden="true">404</p>
  </StatusPage>;
}
