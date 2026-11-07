import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { pageMetadata } from '@/lib/metadata';
import { animationCategories, animationCategory } from '@/lib/vocabulary/animation';
import { VocabularyPage } from '@/components/vocabulary/vocabulary-page';

type Props = { params: Promise<{ lang: string; category: string }> };
export function generateStaticParams() {
  return animationCategories.map(({ id }) => ({ category: id }));
}
export async function generateMetadata({ params }: Props) {
  const { lang, category } = await params;
  if (!isLocale(lang) || !animationCategory(category)) return {};
  const t = await getTranslations({ locale: lang, namespace: 'AnimationVocabulary' });
  return pageMetadata(lang, localePath(lang, `/animation-vocabulary/${category}`), `${t(category)} · ${t('title')}`, t('description'));
}
export default async function AnimationDictionaryCategory({ params }: Props) {
  const { lang, category: id } = await params;
  const category = animationCategory(id);
  if (!isLocale(lang) || !category) notFound();
  setRequestLocale(lang);
  const messages = await getMessages();
  return <NextIntlClientProvider messages={{ AnimationVocabulary: messages.AnimationVocabulary, Ui: messages.Ui }}>
    <VocabularyPage collection="animation" category={category} />
  </NextIntlClientProvider>;
}
