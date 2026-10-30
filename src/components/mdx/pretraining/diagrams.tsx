import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { BookOpenIcon } from '@phosphor-icons/react/dist/ssr/BookOpen';
import { ChatsIcon } from '@phosphor-icons/react/dist/ssr/Chats';
import { CodeIcon } from '@phosphor-icons/react/dist/ssr/Code';
import { tokenizationText } from '../tokenization/model';
import { TokenPairs } from '../tokenization/token-pairs';

export const pretrainingFlowClass = 'grid w-full grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)_1.25rem_minmax(0,1fr)] items-center gap-3.5 @max-[480px]/training:grid-cols-1 @max-[480px]/training:gap-3';

export function FlowArrow() {
  return <ArrowRightIcon size={16} aria-hidden className="justify-self-center text-muted-foreground @max-[480px]/training:rotate-90" />;
}

export function DataCleaningStep() {
  return <div role="group" aria-label="从代码、书籍、文档和问答中收集数据，筛选清洗后得到训练文本" className={pretrainingFlowClass}>
    <ul aria-label="数据来源" className="flex min-w-0 flex-col gap-2 justify-self-center">
      {[
        { Icon: CodeIcon, label: 'GitHub 等代码库' },
        { Icon: BookOpenIcon, label: '书籍、技术文档' },
        { Icon: ChatsIcon, label: 'Stack Overflow 问答' },
      ].map(({ Icon, label }) => <li key={label} className="flex min-w-0 items-center gap-2">
        <Icon size={16} aria-hidden className="shrink-0 text-muted-foreground" /><span>{label}</span>
      </li>)}
    </ul>
    <FlowArrow />
    <div data-pretraining-cleaning className="flex min-h-26 flex-col items-center justify-center gap-2 bg-muted px-2 py-3.5 text-center">
      <span>筛选与清洗</span><span className="text-xs text-muted-foreground">去重、过滤低质量及<br />不适合训练的内容</span>
    </div>
    <FlowArrow />
    <div data-pretraining-text className="flex min-h-26 items-center justify-center bg-muted px-2 py-3.5 text-center">训练文本</div>
  </div>;
}

export function TokenizationStep() {
  return <div role="group" aria-label="将文字切分为 Token，并映射为 Token ID" className="flex w-full flex-col items-center gap-3.5">
    <div className="bg-muted px-4 py-3 text-center text-base">{tokenizationText}</div>
    <div className="flex items-center gap-2 text-caption text-muted-foreground"><ArrowDownIcon size={16} aria-hidden className="shrink-0" /><span>Tokenizer（Token → Token ID）</span></div>
    <TokenPairs />
  </div>;
}
