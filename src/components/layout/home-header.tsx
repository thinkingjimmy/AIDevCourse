import { localePath } from '@/lib/i18n/routing';
import type { ReactNode } from 'react';
import { PageContainer, SiteFooter, SiteLogo } from './page-primitives';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { getCatalog } from '@/lib/content/source';
import { site } from '@/lib/site-config';
import { lessonIndex } from '../search/lessons';
import { HomeLanguageSwitcher, LanguageSwitcher } from './language-switcher';
import { SearchShortcut } from '../search/search-shortcut';
import { AuthorDialog } from '../author/author-card';
import { SiteHeader } from './site-header';
export function SiteBar({ locale, homeLabel, navLabel, children }: {
  locale: Locale; homeLabel: string; navLabel: string; children?: ReactNode;
}) {
  return <header className="sticky top-0 z-40 h-(--zinc-header) shrink-0 border-b border-border bg-background backdrop-blur-[8px] group-data-[variant=open]/site:border-b-0 group-data-[variant=reading]/site:static"><PageContainer className="flex h-full items-center gap-7 max-[721px]:gap-4 group-data-[variant=open]/site:left-0 group-data-[variant=open]/site:w-full group-data-[variant=reading]/site:left-0 group-data-[variant=reading]/site:w-full">
    <SiteLogo href={localePath(locale)} aria-label={`${site.name} · ${homeLabel}`} className="justify-start [&_[data-slot=brand-mark]]:size-[35.2px]" />
    <nav className="ml-auto flex shrink-0 items-center gap-2.5 text-caption text-muted-foreground" aria-label={navLabel}>{children}</nav>
  </PageContainer></header>;
}
export async function HomeHeader({ locale, hero = false }: { locale: Locale; hero?: boolean }) {
  const t = await getTranslations({ locale, namespace: 'Home' });
  const ui = await getTranslations({ locale, namespace: 'Ui' });
  const vocabulary = await getTranslations({ locale, namespace: 'Vocabulary' });
  const animationVocabulary = await getTranslations({ locale, namespace: 'AnimationVocabulary' });
  const programmingVocabulary = await getTranslations({ locale, namespace: 'ProgrammingVocabulary' });
  const catalog = getCatalog();
  return <SiteHeader locale={locale} hero={hero} courses={catalog.courses.filter(course => course.locale === locale).map(({ url, title }) => ({ url, title }))}
    labels={{ home: ui('home'), navigation: t('navLabel'), vocabulary: { design: vocabulary('title'), animation: animationVocabulary('title'), programming: programmingVocabulary('title') } }}
    shortcut={<SearchShortcut locale={locale} version={catalog.version} lessons={lessonIndex(catalog, locale)} />}>
    <AuthorDialog />
    <LanguageSwitcher locale={locale} translations={catalog.translations} />
  </SiteHeader>;
}

export async function HomeFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'Home' });
  return <SiteFooter meta={t('footerMeta')} tools={<HomeLanguageSwitcher locale={locale} translations={getCatalog().translations} />}>
    {t('footerLead')}
  </SiteFooter>;
}
