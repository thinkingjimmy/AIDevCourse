/**
 * [INPUT]: Fumadocs primitives, preview links, parsed mark elements, the local marker-stroke asset, shared UI, Phosphor icons, headings, author notes, chat messages, code blocks, lesson demos, and validated article achievement definitions.
 * [OUTPUT]: The shared MDX registry, including automatic link previews, gray marker-stroke highlights, themed tables, Callout, JimmyNote, Chat, configurable ChatMessage, lesson demos, TokenizationDiagram, and configurable article achievements.
 * [POS]: MDX rendering registry used by course and lesson pages.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
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
import { JimmyNote } from './jimmy-note';
import { Chat, ChatMessage } from './chat/chat-message';
import { LLMGenerationDemo } from './llm-generation-demo';
import { MenuComparisonDemo } from './menu-comparison-demo';
import { TokenizationDiagram } from './tokenization-diagram';
import { LinkPreview } from './link-preview/link-preview';
import { getAchievementComponents } from './achievement/components';
import type { AchievementDefinition } from '@/lib/content/model';
import type { MDXComponents } from 'mdx/types';
function Callout({ title, type = 'info', children }: { title?: ReactNode; type?: string; children?: ReactNode }) {
  const Icon = type === 'warning' || type === 'warn' || type === 'error' ? WarningIcon : InfoIcon;
  return <Alert data-type={type} role="note"><Icon className={type === 'warning' || type === 'error' ? 'mt-[5px] text-review' : 'mt-[5px] text-foreground'} size={18} aria-hidden /><AlertDescription>{title && <AlertTitle>{title}</AlertTitle>}<div>{children}</div></AlertDescription></Alert>;
}
function MarkdownTable({ className, ...props }: ComponentProps<'table'>) {
  return <div className="my-6"><Table {...props} className={cn('[&_th]:min-w-40 [&_td]:min-w-40 [&_th]:[overflow-wrap:anywhere] [&_td]:[overflow-wrap:anywhere]', className)} /></div>;
}
function HighlightedText({ className, ...props }: ComponentProps<'mark'>) {
  return <mark {...props} className={cn('box-decoration-clone bg-transparent bg-[url(/images/highlight-stroke.svg)] bg-no-repeat px-0.5 text-inherit [background-size:100%_0.95em] [background-position:0_70%] [overflow-wrap:anywhere]', className)} />;
}
export function getMDXComponents(achievements: readonly AchievementDefinition[] = []): MDXComponents {
  return {
    ...defaults, Steps, Step, Callout, JimmyNote, Chat, ChatMessage, LLMGenerationDemo, MenuComparisonDemo, TokenizationDiagram, ...getAchievementComponents(achievements), pre: LocalizedCodeBlock,
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
