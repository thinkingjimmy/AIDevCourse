/**
 * [INPUT]: Fumadocs primitives, shared Alert and Table parts, Phosphor icons, Heading, JimmyNote, and localized code block.
 * [OUTPUT]: The shared MDX registry, including themed tables, Callout, and JimmyNote.
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
import type { MDXComponents } from 'mdx/types';
function Callout({ title, type = 'info', children }: { title?: ReactNode; type?: string; children?: ReactNode }) {
  const Icon = type === 'warning' || type === 'warn' || type === 'error' ? WarningIcon : InfoIcon;
  return <Alert data-type={type} role="note"><Icon className={type === 'warning' || type === 'error' ? 'mt-[5px] text-[var(--review)]' : 'mt-[5px] text-foreground'} size={18} aria-hidden /><AlertDescription>{title && <AlertTitle>{title}</AlertTitle>}<div>{children}</div></AlertDescription></Alert>;
}
function MarkdownTable({ className, ...props }: ComponentProps<'table'>) {
  return <div className="my-6"><Table {...props} className={cn('[&_th]:min-w-40 [&_td]:min-w-40 [&_th]:[overflow-wrap:anywhere] [&_td]:[overflow-wrap:anywhere]', className)} /></div>;
}
export function getMDXComponents(): MDXComponents {
  return {
    ...defaults, Steps, Step, Callout, JimmyNote, pre: LocalizedCodeBlock,
    table: MarkdownTable, thead: TableHeader, tbody: TableBody, tfoot: TableFooter,
    tr: TableRow, th: TableHead, td: TableCell, caption: TableCaption,
    h1: (props) => <Heading as="h1" {...props} />,
    h2: (props) => <Heading as="h2" {...props} />,
    h3: (props) => <Heading as="h3" {...props} />,
    h4: (props) => <Heading as="h4" {...props} />,
    h5: (props) => <Heading as="h5" {...props} />,
    h6: (props) => <Heading as="h6" {...props} />,
  };
}
