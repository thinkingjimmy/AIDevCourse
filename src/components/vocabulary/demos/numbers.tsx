'use client';
import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleDemo } from './controls';

export function TabularDemo() {
  const t = useTranslations('Vocabulary');
  const format = useFormatter();
  const [enabled, setEnabled] = useState(false);
  const amounts = [11111, 88888, 99999];
  const total = amounts.reduce((sum, cents) => sum + cents, 0);
  const amount = (cents: number) => format.number(cents / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <ToggleDemo label={t('terms.tabular-nums.title')} value={enabled} onChange={setEnabled}>
    <Card className="tabular-sample w-full max-w-64 rounded-xl shadow-sm" style={{ fontVariantNumeric: enabled ? 'tabular-nums lining-nums' : 'proportional-nums lining-nums' }}>
      <CardContent className="p-4">
        <p className="m-0 mb-4 text-sm font-medium">{t('receipt.title')}</p>
        <dl className="m-0 space-y-2.5">
          {amounts.map((cents, index) => <div key={cents} className="flex items-baseline justify-between gap-2">
            <dt className="min-w-0 text-xs text-muted-foreground">{t('receipt.item', { number: index + 1 })}</dt>
            <dd className="m-0 flex items-baseline gap-2">
              <span aria-hidden className="text-xs text-muted-foreground">{index > 0 ? '+' : ''}</span>
              <span className="tabular-value whitespace-nowrap text-xl">{amount(cents)}</span>
            </dd>
          </div>)}
          <div className="mt-3 flex items-baseline justify-between gap-2 border-t pt-3">
            <dt className="text-sm font-semibold">{t('receipt.total')}</dt>
            <dd className="tabular-total m-0 whitespace-nowrap text-xl">{amount(total)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  </ToggleDemo>;
}

export function ScriptDemo({ sub = false }: { sub?: boolean }) {
  const t = useTranslations('Vocabulary');
  const [enabled, setEnabled] = useState(false);
  return <ToggleDemo label={t(`terms.${sub ? 'subscript' : 'superscript'}.title`)} value={enabled} onChange={setEnabled}>
    <p className="script-sample" lang="en">{sub ? <>H{enabled ? <sub>2</sub> : '2'}O</> : <>E = mc{enabled ? <sup>2</sup> : '2'}</>}</p>
  </ToggleDemo>;
}
