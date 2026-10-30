'use client';
import { NextIntlClientProvider } from 'next-intl';
import type { Locale } from '@/lib/i18n/config';
import type { Catalog } from '@/lib/content/model';
import en from '@/messages/en.json';
import { SearchShortcut } from '../search/search-shortcut';
import { LanguageSwitcher } from './language-switcher';
import type { SearchLessonMeta } from '../search/lessons';
export function EnglishTools({ version, translations, lessons }: {
  version: string; translations: Catalog['translations']; lessons: Record<string, SearchLessonMeta>;
}) {
  return <NextIntlClientProvider locale={'en' satisfies Locale} messages={en} timeZone="UTC">
    <SearchShortcut locale="en" version={version} lessons={lessons} />
    <LanguageSwitcher locale="en" translations={translations} />
  </NextIntlClientProvider>;
}
