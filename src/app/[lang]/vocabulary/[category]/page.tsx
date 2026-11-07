import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { pageMetadata } from '@/lib/metadata';
import { vocabularyCategories, vocabularyCategory } from '@/lib/vocabulary/catalog';
import { VocabularyPage } from '@/components/vocabulary/vocabulary-page';

type Props = { params: Promise<{ lang: string; category: string }> };
export function generateStaticParams() {
  return vocabularyCategories.map(({ id }) => ({ category: id }));
}
export async function generateMetadata({ params }: Props) {
  const { lang, category } = await params;
  if (!isLocale(lang) || !vocabularyCategory(category)) return {};
  const t = await getTranslations({ locale: lang, namespace: 'Vocabulary' });
  return pageMetadata(lang, localePath(lang, `/vocabulary/${category}`), `${t(category)} · ${t('title')}`, t('description'));
}
export default async function DictionaryCategory({ params }: Props) {
  const { lang, category: id } = await params;
  const category = vocabularyCategory(id);
  if (!isLocale(lang) || !category) notFound();
  setRequestLocale(lang);
  const messages = await getMessages();
  return <NextIntlClientProvider messages={{ Vocabulary: messages.Vocabulary, Ui: messages.Ui }}>
    <VocabularyPage category={category} />
  </NextIntlClientProvider>;
}
