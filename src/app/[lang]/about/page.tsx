/**
 * [INPUT]: Localized product, persistence, cookie, and privacy explanations.
 * [OUTPUT]: About page in the zinc frame: mono eyebrow, two-line title, and a three-column section grid.
 * [POS]: Public usage guide; makes local-only storage and translation coverage clear.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { pageMetadata } from '@/lib/seo/metadata';
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
  return <main id="main-content" className="about-page" tabIndex={-1}>
    <div className="home-inner about-hero">
      <p className="status-kicker">{ui('about')}</p>
      <h1>{t('title')}</h1>
      <p className="about-intro">{t('intro')}</p>
    </div>
    <hr className="home-rule" />
    <div className="home-inner about-grid">{parts.map((part, index) => <section key={part}>
      <span className="mono">{String(index + 1).padStart(2, '0')}</span>
      <h2>{t(`${part}Title`)}</h2>
      <p>{t(part)}</p>
    </section>)}</div>
  </main>;
}
