import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { webTerms } from '@/lib/vocabulary/programming';

export default async function ProgrammingDictionaryEntry({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  redirect(localePath(lang, `/programming-vocabulary/${webTerms[0][0]}`));
}
