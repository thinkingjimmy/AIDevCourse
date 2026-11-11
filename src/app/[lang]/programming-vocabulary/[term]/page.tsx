import { notFound, redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { pageMetadata } from '@/lib/metadata';
import { programmingCategories, programmingCategory, programmingTerm, programmingSections } from '@/lib/vocabulary/programming';
import { ProgrammingReader } from '@/components/vocabulary/programming/reader';
import { StaticWebsiteArticle } from '@/components/vocabulary/programming/static-website-article';

type Props = { params: Promise<{ lang: string; term: string }> };
export function generateStaticParams() {
  return programmingCategories.flatMap(category => category.terms.map(([id]) => ({ term: id })));
}
export async function generateMetadata({ params }: Props) {
  const { lang, term: id } = await params;
  const term = programmingTerm(id);
  if (!isLocale(lang) || !term) return {};
  const t = await getTranslations({ locale: lang, namespace: 'ProgrammingVocabulary' });
  return pageMetadata(lang, localePath(lang, `/programming-vocabulary/${id}`), `${t(`terms.${id}.title`)} · ${t('title')}`, t(`terms.${id}.description`));
}
export default async function ProgrammingDictionaryTerm({ params }: Props) {
  const { lang, term: id } = await params;
  if (!isLocale(lang)) notFound();
  const category = programmingCategory(id);
  if (category) redirect(localePath(lang, `/programming-vocabulary/${category.terms[0][0]}`));
  const term = programmingTerm(id);
  if (!term) notFound();
  setRequestLocale(lang);
  const [messages, t, course] = await Promise.all([
    getMessages(), getTranslations({ locale: lang, namespace: 'ProgrammingVocabulary' }), getTranslations({ locale: lang, namespace: 'Course' }),
  ]);
  const outline = programmingSections[term.id].map(id => ({ title: t(`terms.${term.id}.article.${id}.heading`), url: `#${id}` }));
  const copy = messages.ProgrammingVocabulary as Record<string, unknown> & { terms: Record<string, { title: string; description: string }> };
  const summaries = Object.fromEntries(Object.entries(copy.terms).map(([id, term]) => [id, { title: term.title, description: term.description }]));
  const path = localePath(lang, `/programming-vocabulary/${term.id}`);
  return <NextIntlClientProvider messages={{ ProgrammingVocabulary: { ...copy, terms: summaries }, Ui: messages.Ui, Course: messages.Course }}>
    <ProgrammingReader key={`${lang}-${term.id}`} term={term} title={t(`terms.${term.id}.title`)} outline={outline} outlineLabel={course('onThisPage')}>
      <StaticWebsiteArticle locale={lang} path={path} outlineLabel={course('onThisPage')} />
    </ProgrammingReader>
  </NextIntlClientProvider>;
}
