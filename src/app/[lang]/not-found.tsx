import { getLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { MissingPage } from '@/components/layout/missing-page';
export default async function NotFound() {
  const locale = await getLocale() as Locale;
  return <MissingPage locale={locale} />;
}
