import type { ComponentProps, ReactNode } from 'react';
import defaults from 'fumadocs-ui/mdx';
import { Steps, Step } from 'fumadocs-ui/components/steps';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { LocalizedCodeBlock } from './code-block';
import { Heading } from './heading';
import { JimmyNote } from './notes/jimmy-note';
import { KeyTakeaway } from './notes/key-takeaway';
import { Chat, ChatMessage } from './chat/chat-message';
import { LLMGenerationDemo } from './llm-generation-demo';
import { MenuComparisonDemo } from './menu-comparison-demo';
import { TokenizationDiagram } from './tokenization-diagram';
import { TokenProbabilityDiagram } from './token-probability-diagram';
import { LLMSingleRoundTrainingDemo } from './llm-training/single-round';
import { LLMMultiRoundTrainingDemo } from './llm-training/multi-round';
import { LLMPretrainingOverview } from './pretraining/overview';
import { ChatMessageSequence } from './chat-sequence/demo';
import { LinkPreview } from './link-preview/link-preview';
import { getAchievementComponents } from './achievement/components';
import type { AchievementDefinition } from '@/lib/content/model';
import type { MDXComponents } from 'mdx/types';
function Callout({ title, type = 'info', children }: { title?: ReactNode; type?: string; children?: ReactNode }) {
  const Icon = type === 'warning' || type === 'warn' || type === 'error' ? WarningIcon : InfoIcon;
  return <Alert data-type={type} role="note"><Icon className={type === 'warning' || type === 'error' ? 'mt-[5px] text-review' : 'mt-[5px] text-foreground'} size={18} aria-hidden /><AlertDescription>{title && <AlertTitle>{title}</AlertTitle>}<div>{children}</div></AlertDescription></Alert>;
}
function MarkdownTable({ className, ...props }: ComponentProps<'table'>) {
  return <div className="my-6"><Table {...props} className={cn('[&_th]:whitespace-nowrap [&_code]:whitespace-nowrap', className)} /></div>;
}
function HighlightedText({ className, ...props }: ComponentProps<'mark'>) {
  return <mark {...props} className={cn('box-decoration-clone bg-transparent bg-[url(/images/highlight-stroke.svg)] bg-no-repeat px-0.5 text-inherit [background-size:100%_0.95em] [background-position:0_70%] [overflow-wrap:anywhere]', className)} />;
}
export function getMDXComponents(achievements: readonly AchievementDefinition[] = []): MDXComponents {
  return {
    ...defaults, Steps, Step, Callout, JimmyNote, KeyTakeaway, Chat, ChatMessage, ChatMessageSequence, LLMGenerationDemo, MenuComparisonDemo, TokenizationDiagram, TokenProbabilityDiagram, LLMPretrainingOverview, LLMSingleRoundTrainingDemo, LLMMultiRoundTrainingDemo, ...getAchievementComponents(achievements), pre: LocalizedCodeBlock,
    a: LinkPreview, mark: HighlightedText, table: MarkdownTable, thead: TableHeader, tbody: TableBody, tfoot: TableFooter,
    tr: TableRow, th: TableHead, td: TableCell, caption: TableCaption,
    h1: (props) => <Heading as="h1" {...props} />,
    h2: (props) => <Heading as="h2" {...props} />,
    h3: (props) => <Heading as="h3" {...props} />,
    h4: (props) => <Heading as="h4" {...props} />,
    h5: (props) => <Heading as="h5" {...props} />,
    h6: (props) => <Heading as="h6" {...props} />,
  };
}
