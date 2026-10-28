/**
 * [INPUT]: English header/footer copy, shared Geist fonts, public catalog tools, and the single MissingPage renderer.
 * [OUTPUT]: The root 404 document with the same typography, actions, and recovery content as locale 404 pages.
 * [POS]: Root document adapter for invalid locales; MissingPage owns 404 presentation and recovery data.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { sans, mono, pixel } from '@/lib/fonts';
import { getCatalog } from '@/lib/content/source';
import { EnglishTools } from '@/components/layout/english-tools';
import { SiteShell, SiteFooter } from '@/components/layout/page-primitives';
import { SiteBar } from '@/components/layout/home-header';
import { MissingPage } from '@/components/layout/missing-page';
import { lessonIndex } from '@/components/search/lessons';
import en from '@/messages/en.json';
import '@/styles/globals.css';
export default function GlobalNotFound() {
  const catalog = getCatalog();
  return <html lang="en" className={`light ${sans.variable} ${mono.variable} ${pixel.variable}`}><body>
    <a href="#main-content" className="fixed -top-[100px] left-4 z-[100] bg-foreground px-[18px] py-3 text-white focus:top-3">{en.Ui.skip}</a>
    <SiteShell>
      <SiteBar locale="en" about={en.Ui.about} homeLabel={en.Ui.home} navLabel={en.Home.navLabel}>
        <EnglishTools version={catalog.version} translations={catalog.translations} lessons={lessonIndex(catalog, 'en')} />
      </SiteBar>
      <MissingPage locale="en" />
      <SiteFooter meta={en.Home.footerMeta}>{en.Home.footerLead}</SiteFooter>
    </SiteShell>
  </body></html>;
}
