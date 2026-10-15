/**
 * [INPUT]: English dictionary, catalog version, translation map, and lesson search meta.
 * [OUTPUT]: Search and language controls for the root 404, which sits outside the locale request.
 * [POS]: Client island so the root document can reuse the header tools without a locale param.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { NextIntlClientProvider } from 'next-intl';
import type { Locale } from '@/lib/i18n/config';
import type { Catalog } from '@/lib/content/types';
import en from '@/messages/en.json';
import { SearchTrigger } from '../search/search-trigger';
import { LanguageSwitcher } from './language-switcher';
import type { SearchLessonMeta } from '../search/lessons';
export function EnglishTools({ version, translations, lessons }: {
  version: string; translations: Catalog['translations']; lessons: Record<string, SearchLessonMeta>;
}) {
  return <NextIntlClientProvider locale={'en' satisfies Locale} messages={en} timeZone="UTC">
    <SearchTrigger locale="en" version={version} lessons={lessons} compact />
    <LanguageSwitcher locale="en" translations={translations} compact />
  </NextIntlClientProvider>;
}
