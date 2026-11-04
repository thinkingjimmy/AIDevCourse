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
  // Translation extensions can add root attributes before React hydrates.
  return <html lang="en" className="light" suppressHydrationWarning><body>
    <a href="#main-content" className="fixed -top-[100px] left-4 z-[100] bg-foreground px-[18px] py-3 text-white focus:top-3">{en.Ui.skip}</a>
    <SiteShell>
      <SiteBar locale="en" homeLabel={en.Ui.home} navLabel={en.Home.navLabel}>
        <EnglishTools version={catalog.version} translations={catalog.translations} lessons={lessonIndex(catalog, 'en')} />
      </SiteBar>
      <MissingPage locale="en" />
      <SiteFooter meta={en.Home.footerMeta}>{en.Home.footerLead}</SiteFooter>
    </SiteShell>
  </body></html>;
}
