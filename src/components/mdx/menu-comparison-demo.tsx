'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/overlays/dropdown-menu';

const choices = ['A', 'B', 'C'];

export function MenuComparisonDemo() {
  const t = useTranslations('MenuComparison');
  const locale = useLocale();
  const selected = (choice: string) => choice ? t('selected', { choice: t('choice', { letter: choice }) }) : '';
  const [nativeChoice, setNativeChoice] = useState('');
  const [customChoice, setCustomChoice] = useState('');

  return <figure data-menu-comparison aria-label={t('label')} lang={locale} className="quote-frame not-prose relative my-8 grid grid-cols-2 gap-4 px-5 pt-8 pb-5">
    <figcaption className="absolute start-2.5 top-0 -translate-y-1/2 bg-background px-1.5 text-sm leading-copy font-medium text-brand sm:start-3.5"><span aria-hidden>🧪 </span>{t('try')}</figcaption>
    <div className="flex min-w-0 justify-center">
      <div className="relative w-full max-w-36">
        <Button asChild variant="brand-outline" size="action" className="block w-full cursor-pointer appearance-none rounded-sm px-2 text-base text-transparent hover:text-transparent">
          <select aria-label={t('native') + selected(nativeChoice)} value={nativeChoice} onChange={(event) => setNativeChoice(event.target.value)}>
            <option value="" disabled className="text-foreground">{t('open')}</option>
            {choices.map((choice) => <option key={choice} value={choice} className="text-foreground">{t('choice', { letter: choice })}</option>)}
          </select>
        </Button>
        <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-base font-medium text-brand">{t('open')}</span>
      </div>
    </div>
    <div className="flex min-w-0 justify-center">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="brand-outline" size="action" className="w-full max-w-36 rounded-sm px-2 text-base" aria-label={t('custom') + selected(customChoice)}>
            {t('open')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-sm border-brand/35 text-brand shadow-[4px_4px_0_var(--color-brand-soft)]" aria-label={t('options')} lang={locale}>
          {choices.map((choice) => <DropdownMenuItem key={choice} className="rounded-sm data-[highlighted]:bg-brand-soft data-[highlighted]:text-brand" onSelect={() => setCustomChoice(choice)}>{t('choice', { letter: choice })}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </figure>;
}
