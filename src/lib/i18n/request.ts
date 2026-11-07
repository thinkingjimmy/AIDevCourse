import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale } from './config';
import { loadMessages } from './messages';
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  if (!isLocale(locale)) notFound();
  const messages = await loadMessages(locale);
  return { locale, timeZone: 'UTC', messages };
});
