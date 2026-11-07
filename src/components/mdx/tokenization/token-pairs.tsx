import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { useTranslations } from 'next-intl';
import type { Token } from './model';

export function TokenPairs({ tokens }: { tokens: readonly Token[] }) {
  const t = useTranslations('Tokenization');
  return <ol aria-label={t('pairs', { count: tokens.length })} data-token-pairs className="flex w-full flex-wrap gap-x-2 gap-y-4">
    {tokens.map((token, index) => <li key={index} className="min-w-fit max-w-full flex-1 basis-18">
      <dl className="grid h-full min-w-0 grid-rows-[1fr_auto] justify-items-center gap-2">
        <dt className="flex w-full items-center justify-center rounded-sm bg-muted px-1 py-2 text-center text-base whitespace-pre-wrap wrap-break-word"><span className="sr-only">{t('tokenLabel')}</span>{token.text}</dt>
        <dd className="flex flex-col items-center gap-2 font-mono text-sm tabular-nums">
          <ArrowDownIcon size={16} aria-hidden className="text-muted-foreground" />
          <span data-token-id={token.id}><span className="sr-only">{t('tokenIdLabel')}</span>{token.id}</span>
        </dd>
      </dl>
    </li>)}
  </ol>;
}
