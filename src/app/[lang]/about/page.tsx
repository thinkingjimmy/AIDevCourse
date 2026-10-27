/**
 * [INPUT]: Localized product, persistence, cookie, and privacy explanations.
 * [OUTPUT]: About page in the zinc frame: mono eyebrow, two-line title, and a three-column section grid.
 * [POS]: Public usage guide; makes local-only storage and translation coverage clear.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { PageContainer, PageTitle, PageEyebrow } from '@/components/layout/page-primitives';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { pageMetadata } from '@/lib/metadata';
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: 'About' });
  return pageMetadata(lang, `/${lang}/about`, t('title').replaceAll('\n', ' '), t('intro'));
}
export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: 'About' });
  const ui = await getTranslations({ locale: lang, namespace: 'Ui' });
  const parts = ['storage', 'languages', 'privacy'] as const;
  return <main id="main-content" className="flex flex-[1_0_auto] flex-col" tabIndex={-1}>
    <PageContainer className="pt-[72px] pb-14 max-[721px]:pt-10 max-[721px]:pb-8">
      <PageEyebrow>{ui('about')}</PageEyebrow>
      <PageTitle>{t('title')}</PageTitle>
      <p className="m-0 max-w-[40rem] text-[16px] leading-[1.75] text-muted-foreground">{t('intro')}</p>
    </PageContainer>
    <hr className="m-0 h-0 border-0 border-t border-border" />
    <PageContainer className="grid flex-1 grid-cols-3 px-0 max-[721px]:grid-cols-1 max-[721px]:px-0">{parts.map((part, index) => <section className="min-w-0 px-7 pt-9 pb-20 [&+section]:border-l [&+section]:border-border max-[721px]:px-4 max-[721px]:pt-7 max-[721px]:pb-9 max-[721px]:[&+section]:border-t max-[721px]:[&+section]:border-l-0" key={part}>
      <span className="mb-3.5 block font-mono text-[12px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
      <h2 className="m-0 mb-3 font-sans text-[18px] font-semibold tracking-[-.01em]">{t(`${part}Title`)}</h2>
      <p className="m-0 text-[15px] leading-[1.75] text-muted-foreground">{t(part)}</p>
    </section>)}</PageContainer>
  </main>;
}
