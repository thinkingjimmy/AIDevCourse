'use client';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { NextProvider } from 'fumadocs-core/framework/next';
import { I18nProvider } from 'fumadocs-ui/contexts/i18n';
import type { ReactNode } from 'react';
import { defaultLocale, type Locale } from '@/lib/i18n/config';
export function Providers({ locale, messages, translations, children }: {
  locale: Locale; messages: AbstractIntlMessages; translations: Record<string, string>; children: ReactNode;
}) {
  return <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
    <NextProvider><I18nProvider locale={locale} translations={translations} defaultLanguage={defaultLocale} hideLocale="default-locale">
      {children}
    </I18nProvider></NextProvider>
  </NextIntlClientProvider>;
}
