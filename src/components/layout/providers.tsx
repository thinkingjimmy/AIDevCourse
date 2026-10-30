'use client';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import { defaultLocale, type Locale } from '@/lib/i18n/config';
export function Providers({ locale, messages, translations, children }: {
  locale: Locale; messages: AbstractIntlMessages; translations: Record<string, string>; children: ReactNode;
}) {
  return <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
    <RootProvider theme={{ enabled: false }} search={{ enabled: false }} i18n={{ locale, translations, defaultLanguage: defaultLocale, hideLocale: 'default-locale' }}>{children}</RootProvider>
  </NextIntlClientProvider>;
}
