/**
 * [INPUT]: The validated language route and next-intl request context.
 * [OUTPUT]: A real, localized 404 for unknown paths under a supported language.
 * [POS]: Catch-all sibling of the public page routes.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
export default async function MissingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (isLocale(lang)) setRequestLocale(lang);
  notFound();
}
