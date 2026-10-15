/**
 * [INPUT]: The explicit route language and the localized unavailable-page renderer.
 * [OUTPUT]: Full server HTML for the proxy to return with HTTP 404.
 * [POS]: Static error document; notFound() in this Next.js version emits an empty shell.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import NotFound from '../not-found';
export const metadata = { robots: { index: false, follow: false } };
export default async function UnavailablePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  return <NotFound />;
}
