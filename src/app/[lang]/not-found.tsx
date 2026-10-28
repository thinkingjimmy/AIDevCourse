/**
 * [INPUT]: Current language context and the shared MissingPage renderer.
 * [OUTPUT]: The single localized 404 presentation inside the existing site frame.
 * [POS]: Locale boundary adapter; all copy, recovery links, and styling belong to MissingPage.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { getLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { MissingPage } from '@/components/layout/missing-page';
export default async function NotFound() {
  const locale = await getLocale() as Locale;
  return <MissingPage locale={locale} />;
}
