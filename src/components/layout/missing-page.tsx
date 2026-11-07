import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { getCatalog } from '@/lib/content/source';
import { htmlLanguages, languageNames, locales, type Locale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { Button } from '@/components/ui/button';
import { StatusPage, PageTitle, PageActions } from './page-primitives';
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
  return <StatusPage id="main-content" data-slot="missing-page" className="missing-page left-0 mx-0 w-full" tabIndex={-1}>
    <section className="missing-window" aria-labelledby="missing-title">
      <div className="missing-window-bar">
        <p className="mac-window-heading m-0"><span className="font-pixel text-lg font-normal">404</span></p>
      </div>
      <div className="missing-window-body">
        <div className="missing-disk" aria-hidden="true">
          <Image src="/images/home/disks/ivory.svg" width={88} height={94} alt="" unoptimized draggable={false} />
          <span className="font-pixel text-6xl leading-none text-brand max-[721px]:text-3xl">?</span>
        </div>
        <div className="missing-copy">
          <PageTitle id="missing-title" className="m-0 mb-3 font-pixel text-display leading-heading font-normal text-brand text-balance max-[721px]:text-2xl">{ui('notFoundTitle')}</PageTitle>
          <p className="m-0 text-base leading-body text-reading">{ui('notFoundBody')}</p>
        </div>
        <PageActions className="missing-actions">
          <Button asChild variant="brand-outline" size="action" className="missing-action missing-action-primary"><a href={homeHref} data-missing-action="home">{ui('backHome')}<ArrowRightIcon size={16} aria-hidden /></a></Button>
          {course && <Button asChild variant="brand-outline" size="action" className="missing-action"><a href={course.url} data-missing-action="course">{course.title}<ArrowRightIcon size={16} aria-hidden /></a></Button>}
        </PageActions>
      </div>
      <div className="missing-window-footer">
        <p className="m-0 text-caption text-brand">{courseCopy('otherLanguages')}</p>
        <nav className="missing-languages" aria-label={courseCopy('otherLanguages')}>{languages.map((language) => <a key={language.href} href={language.href} lang={language.lang}>{language.label}</a>)}</nav>
      </div>
    </section>
  </StatusPage>;
}
