import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { tokenizationTokens } from './model';

export function TokenPairs() {
  return <ol aria-label="按原文顺序排列的 6 组词元与 ID" className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,4.5rem),1fr))] gap-x-2 gap-y-4">
    {tokenizationTokens.map((token) => <li key={token.id}>
      <dl className="flex min-w-0 flex-col items-center gap-2">
        <dt className="w-full rounded-sm bg-muted px-1 py-2 text-center text-base"><span className="sr-only">Token：</span>{token.text}</dt>
        <dd className="flex flex-col items-center gap-2 font-mono text-sm tabular-nums">
          <ArrowDownIcon size={16} aria-hidden className="text-muted-foreground" />
          <span data-token-id={token.id}><span className="sr-only">Token ID：</span>{token.id}</span>
        </dd>
      </dl>
    </li>)}
  </ol>;
}
