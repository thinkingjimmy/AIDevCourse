/**
 * [INPUT]: next-intl request locale and its dictionary.
 * [OUTPUT]: Server translation configuration with deterministic date handling.
 * [POS]: Dictionary boundary; never loads all languages into a client bundle.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale } from './config';
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  if (!isLocale(locale)) notFound();
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, timeZone: 'UTC', messages };
});
