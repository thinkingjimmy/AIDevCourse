import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/lib/i18n/config';
import { getTokenizationExample } from './tokenization/model';
import { TokenPairs } from './tokenization/token-pairs';

const textPanelClass = 'w-full rounded-sm bg-muted px-3 py-4 text-lg font-medium';
const tokenizerPanelClass = 'flex flex-col gap-4 rounded-sm border border-border p-3 @min-[500px]/tokenization:p-4';
const tokenizerHeadingClass = 'flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1';

function TokenIdArray({ ids, label }: { ids: readonly number[]; label: string }) {
  return <code aria-label={label} className="block max-w-full px-2 font-mono text-sm leading-reading tabular-nums whitespace-normal [overflow-wrap:anywhere]">
    {`[${ids.join(', ')}]`}
  </code>;
}

export function TokenizationDiagram() {
  const t = useTranslations('Tokenization');
  const locale = useLocale() as Locale;
  const { text, tokens, output: outputToken } = getTokenizationExample(locale);
  return <figure data-tokenization-diagram aria-label={t('label')} lang={locale}
    className="quote-frame not-prose @container/tokenization my-8 flex flex-col gap-4 p-4 text-base leading-body text-foreground sm:p-5">
    <div className="flex flex-col items-center gap-2 text-center">
      <div className={textPanelClass}>{text}</div>
      <ArrowDownIcon size={20} aria-hidden className="text-muted-foreground" />
    </div>

    <div className={tokenizerPanelClass}>
      <div className={tokenizerHeadingClass}>
        <span className="font-medium">{t('tokenizer')}</span>
        <span className="text-caption text-muted-foreground">{t('encoding')}</span>
      </div>
      <div className="text-sm text-reading">{t('splitting')}</div>
      <TokenPairs tokens={tokens} />
    </div>

    <div className="flex flex-col items-center gap-2 text-center">
      <ArrowDownIcon size={20} aria-hidden className="text-muted-foreground" />
      <span className="text-caption text-muted-foreground">{t('inputOrder')}</span>
      <TokenIdArray ids={tokens.map((token) => token.id)} label={t('inputArray')} />
      <ArrowDownIcon size={20} aria-hidden className="text-muted-foreground" />
      <div className={textPanelClass}>LLM</div>
    </div>

    <div className="flex flex-col items-center gap-2 text-center">
      <ArrowDownIcon size={20} aria-hidden className="text-muted-foreground" />
      <span className="text-caption text-muted-foreground">{t('output')}</span>
      <TokenIdArray ids={[outputToken.id]} label={t('outputArray')} />
      <ArrowDownIcon size={20} aria-hidden className="text-muted-foreground" />
    </div>
    <div role="group" aria-label={t('decodingLabel')} className={tokenizerPanelClass}>
      <div className={tokenizerHeadingClass}>
        <span className="font-medium">{t('tokenizer')}</span>
        <span className="text-caption text-muted-foreground">{t('decoding')}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-center">
        <dl className="flex min-w-0 flex-col gap-2">
          <dt className="text-caption text-muted-foreground">{t('tokenId')}</dt>
          <dd className="py-2 font-mono text-lg tabular-nums">{outputToken.id}</dd>
        </dl>
        <ArrowRightIcon size={20} aria-hidden className="text-muted-foreground" />
        <dl className="flex min-w-0 flex-col gap-2">
          <dt className="text-caption text-muted-foreground">{t('token')}</dt>
          <dd className="rounded-sm bg-muted px-1 py-2 text-lg font-medium">{outputToken.text}</dd>
        </dl>
      </div>
    </div>
    <div className="flex flex-col items-center gap-2 text-center">
      <ArrowDownIcon size={20} aria-hidden className="text-muted-foreground" />
      <span className="text-caption text-muted-foreground">{t('shown')}</span>
      <div data-token-output className={textPanelClass}>{outputToken.text}</div>
    </div>
  </figure>;
}
