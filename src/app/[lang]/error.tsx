/**
 * [INPUT]: Localized error messages and Next.js retry action.
 * [OUTPUT]: Zinc error state with retry and a link home, without touching local learning records.
 * [POS]: Language-level runtime error recovery inside the shared site frame.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations('Ui');
  const locale = useLocale();
  return <main id="main-content" className="status-simple" tabIndex={-1}>
    <p className="status-kicker">{t('errorEyebrow')}</p>
    <h1>{t('errorTitle')}</h1>
    <p className="status-lead">{t('error')}</p>
    <div className="home-ctas">
      <button className="home-cta" type="button" onClick={reset}>{t('retry')}</button>
      <Link className="home-cta home-cta-secondary" href={`/${locale}`}>{t('backHome')}</Link>
    </div>
  </main>;
}
