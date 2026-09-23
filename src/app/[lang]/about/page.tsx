/**
 * [INPUT]: Localized product, persistence, cookie, and privacy explanations.
 * [OUTPUT]: Server-rendered about page in the explicitly selected language.
 * [POS]: Public usage guide; makes local-only storage and translation coverage clear.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { GridFrame } from '@/components/layout/grid-frame';
import { pageMetadata } from '@/lib/seo/metadata';
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: 'About' });
  return pageMetadata(lang, `/${lang}/about`, t('title'), t('intro'));
}
export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: 'About' });
  return <main id="main-content" className="site-main" tabIndex={-1}><GridFrame><header className="page-heading"><p className="eyebrow"><span className="square-dot" aria-hidden />Learning AI Coding</p><h1 className="serif">{t('title')}</h1><p>{t('intro')}</p></header><div className="about-body">{(['storage', 'languages', 'privacy'] as const).map((part, index) => <section key={part}><span className="mono">0{index + 1}</span><div><h2>{t(`${part}Title`)}</h2><p>{t(part)}</p></div></section>)}</div></GridFrame></main>;
}
