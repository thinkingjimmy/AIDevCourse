import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { animationCategories } from '@/lib/vocabulary/animation';

export default async function AnimationDictionaryEntry({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  redirect(localePath(lang, `/animation-vocabulary/${animationCategories[0].id}`));
}
