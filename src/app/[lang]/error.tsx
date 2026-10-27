/**
 * [INPUT]: Localized error messages and Next.js retry action, canonical locale paths.
 * [OUTPUT]: Zinc error state with retry and a link home, without touching local learning records.
 * [POS]: Language-level runtime error recovery inside the shared site frame.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { localePath } from '@/lib/i18n/routing';
import type { Locale } from '@/lib/i18n/config';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatusPage, PageTitle, PageEyebrow, PageActions } from '@/components/layout/page-primitives';
import { useLocale, useTranslations } from 'next-intl';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations('Ui');
  const locale = useLocale() as Locale;
  return <StatusPage id="main-content" className="flex flex-col justify-center" tabIndex={-1}>
    <PageEyebrow>{t('errorEyebrow')}</PageEyebrow>
    <PageTitle>{t('errorTitle')}</PageTitle>
    <p className="m-0 mb-7 max-w-[40rem] text-base leading-body text-muted-foreground">{t('error')}</p>
    <PageActions>
      <Button variant="action" size="action" className="font-normal leading-[inherit]" onClick={reset}>{t('retry')}</Button>
      <Button asChild variant="action-outline" size="action"><Link href={localePath(locale)}>{t('backHome')}</Link></Button>
    </PageActions>
  </StatusPage>;
}
