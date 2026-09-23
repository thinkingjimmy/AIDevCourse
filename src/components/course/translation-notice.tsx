/**
 * [INPUT]: A public document's revision status and actual original language.
 * [OUTPUT]: Localized stale-translation notice with a valid original link.
 * [POS]: Shared course/lesson revision feedback, independent of tool verification dates.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { languageNames, type Locale } from '@/lib/i18n/config';
import type { ContentDocument } from '@/lib/content/types';
export async function TranslationNotice({ document, sourceLocale }: { document: ContentDocument; sourceLocale: Locale }) {
  if (!document.stale) return null;
  const t = await getTranslations({ locale: document.locale, namespace: 'Ui' });
  return <aside className="notice"><p>{t('stale')}</p><Link href={document.sourceUrl}>{t('original', { language: languageNames[sourceLocale] })}</Link></aside>;
}
