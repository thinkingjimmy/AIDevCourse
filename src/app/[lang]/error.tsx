/**
 * [INPUT]: Localized error messages and Next.js retry action.
 * [OUTPUT]: Accessible retry boundary without touching local learning records.
 * [POS]: Language-level runtime error recovery.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useTranslations } from 'next-intl';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations('Ui');
  return <main id="main-content" className="not-found"><h1>{t('error')}</h1><button className="button primary" onClick={reset}>{t('retry')}</button></main>;
}
