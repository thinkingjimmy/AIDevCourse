import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { tokenizationText, tokenizationTokens as tokens } from './tokenization/model';
import { TokenPairs } from './tokenization/token-pairs';

const textPanelClass = 'w-full bg-muted px-3 py-4 text-lg font-medium';
const tokenizerPanelClass = 'flex flex-col gap-4 border border-border p-3 @min-[500px]/tokenization:p-4';
const tokenizerHeadingClass = 'flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1';

const outputToken = tokens[0];

function TokenIdArray({ ids, label }: { ids: readonly number[]; label: string }) {
  return <code aria-label={label} className="block max-w-full px-2 font-mono text-sm leading-reading tabular-nums whitespace-normal [overflow-wrap:anywhere]">
    {`[${ids.join(', ')}]`}
  </code>;
}

export function TokenizationDiagram() {
  return <figure aria-label="文本编码、模型运算与输出解码的过程" lang="zh-CN"
    className="quote-frame not-prose @container/tokenization my-8 flex flex-col gap-4 p-4 text-base leading-body text-foreground sm:p-5">
    <div className="flex flex-col items-center gap-2 text-center">
      <div className={textPanelClass}>{tokenizationText}</div>
      <ArrowDownIcon size={20} aria-hidden className="text-muted-foreground" />
    </div>

    <div className={tokenizerPanelClass}>
      <div className={tokenizerHeadingClass}>
        <span className="font-medium">词元处理器 Tokenizer</span>
        <span className="text-caption text-muted-foreground">编码 Encoding</span>
      </div>
      <div className="text-sm text-reading">切分为词元（Token），再映射为词元 ID（Token ID）</div>
      <TokenPairs />
    </div>

    <div className="flex flex-col items-center gap-2 text-center">
      <ArrowDownIcon size={20} aria-hidden className="text-muted-foreground" />
      <span className="text-caption text-muted-foreground">Token ID 按原顺序送入模型</span>
      <TokenIdArray ids={tokens.map((token) => token.id)} label="输入 Token ID 数组" />
      <ArrowDownIcon size={20} aria-hidden className="text-muted-foreground" />
      <div className={textPanelClass}>LLM</div>
    </div>

    <div className="flex flex-col items-center gap-2 text-center">
      <ArrowDownIcon size={20} aria-hidden className="text-muted-foreground" />
      <span className="text-caption text-muted-foreground">模型输出 Token ID</span>
      <TokenIdArray ids={[outputToken.id]} label="输出 Token ID 数组" />
      <ArrowDownIcon size={20} aria-hidden className="text-muted-foreground" />
    </div>
    <div role="group" aria-label="Tokenizer 解码" className={tokenizerPanelClass}>
      <div className={tokenizerHeadingClass}>
        <span className="font-medium">词元处理器 Tokenizer</span>
        <span className="text-caption text-muted-foreground">解码 Decoding</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-center">
        <dl className="flex min-w-0 flex-col gap-2">
          <dt className="text-caption text-muted-foreground">Token ID</dt>
          <dd className="py-2 font-mono text-lg tabular-nums">{outputToken.id}</dd>
        </dl>
        <ArrowRightIcon size={20} aria-hidden className="text-muted-foreground" />
        <dl className="flex min-w-0 flex-col gap-2">
          <dt className="text-caption text-muted-foreground">Token</dt>
          <dd className="rounded-sm bg-muted px-1 py-2 text-lg font-medium">{outputToken.text}</dd>
        </dl>
      </div>
    </div>
    <div className="flex flex-col items-center gap-2 text-center">
      <ArrowDownIcon size={20} aria-hidden className="text-muted-foreground" />
      <span className="text-caption text-muted-foreground">呈现给用户</span>
      <div data-token-output className={textPanelClass}>{outputToken.text}</div>
    </div>
  </figure>;
}
