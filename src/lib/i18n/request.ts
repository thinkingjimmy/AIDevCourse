import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale } from './config';
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  if (!isLocale(locale)) notFound();
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, timeZone: 'UTC', messages };
});
