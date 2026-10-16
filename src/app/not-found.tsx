/**
 * [INPUT]: English copy and the public catalog for paths outside any valid locale.
 * [OUTPUT]: Root 404 with the zinc header, footer, and the same two-column unavailable layout.
 * [POS]: Root error document for invalid locales and unknown paths the proxy does not rewrite.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { IBM_Plex_Mono } from 'next/font/google';
import { getCatalog } from '@/lib/content/source';
import { htmlLanguages, languageNames, locales } from '@/lib/i18n/config';
import { EnglishTools } from '@/components/layout/english-tools';
import { SiteShell, SiteFooter } from '@/components/layout/page-primitives';
import { SiteBar } from '@/components/layout/home-header';
import { MissingPage } from '@/components/layout/missing-page';
import { lessonIndex } from '@/components/search/lessons';
import en from '@/messages/en.json';
import '@/styles/globals.css';
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' });
export default function GlobalNotFound() {
  const catalog = getCatalog();
  const course = catalog.courses.find((item) => item.locale === 'en' && item.slug === 'ai-101');
  const languages = locales.filter((lang) => lang !== 'en').map((lang) => {
    const alternate = catalog.courses.find((item) => item.locale === lang && item.slug === 'ai-101') ?? catalog.courses.find((item) => item.locale === lang);
    return { href: alternate?.url ?? `/${lang}`, lang: htmlLanguages[lang], label: languageNames[lang] };
  });
  return <html lang="en" className={`light ${mono.variable}`}><body>
    <a href="#main-content" className="fixed -top-[100px] left-4 z-[100] bg-foreground px-[18px] py-3 text-white focus:top-3">{en.Ui.skip}</a>
    <SiteShell>
      <SiteBar locale="en" about={en.Ui.about} homeLabel={en.Ui.home} navLabel={en.Home.navLabel}>
        <EnglishTools version={catalog.version} translations={catalog.translations} lessons={lessonIndex(catalog, 'en')} />
      </SiteBar>
      <MissingPage title={en.Ui.notFoundTitle} body={en.Ui.notFoundBody} primaryHref={course?.url ?? '/en/courses/ai-101'} primaryLabel={course?.title ?? 'AI 101'} homeHref="/en" homeLabel={en.Ui.backHome} languagesLabel={en.Course.otherLanguages} languages={languages} />
      <SiteFooter meta={en.Home.footerMeta}>{en.Home.footerLead}</SiteFooter>
    </SiteShell>
  </body></html>;
}
