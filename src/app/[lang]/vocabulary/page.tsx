import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { vocabularyCategories } from '@/lib/vocabulary/catalog';

export default async function DictionaryEntry({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  redirect(localePath(lang, `/vocabulary/${vocabularyCategories[0].id}`));
}
