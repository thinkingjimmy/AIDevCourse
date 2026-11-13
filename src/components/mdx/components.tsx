import { Children, cloneElement, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import defaults from 'fumadocs-ui/mdx';
import { Steps, Step } from 'fumadocs-ui/components/steps';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { LocalizedCodeBlock } from './code-block';
import { MermaidDiagram } from './mermaid-diagram';
import { Heading } from './heading';
import { JimmyNote } from './notes/jimmy-note';
import { JimmyNoteAnchor } from './notes/note-anchor';
import { KeyTakeaway } from './notes/key-takeaway';
import { Chat, ChatMessage, ChatThinking } from './chat/chat-message';
import { ChatToolCall } from './chat/tool-call';
import { InlineCitation } from './chat/inline-citation';
import { LLMGenerationDemo } from './llm-generation-demo';
import { MenuComparisonDemo } from './menu-comparison-demo';
import { NewtonSecondLawDemo } from './physics/newton-second-law-demo';
import { AnimationDemo } from './motion/demo';
import { FrontendLayersDemo } from './frontend/layers';
import { FrontendInspectorDemo } from './frontend/inspector';
import { FrontendInspectorPractice } from './frontend/practice';
import { HoverGardenDemo } from './hover-garden';
import { TokenizationDiagram } from './tokenization-diagram';
import { TokenProbabilityDiagram } from './token-probability-diagram';
import { LLMSingleRoundTrainingDemo } from './llm-training/single-round';
import { LLMMultiRoundTrainingDemo } from './llm-training/multi-round';
import { LLMPretrainingOverview } from './pretraining/overview';
import { ChatMessageSequence } from './chat-sequence/demo';
import { LinkPreview } from './link-preview/link-preview';
import { XEmbed } from './embeds/x-embed';
import { YouTube } from './embeds/youtube';
import { WebsitePreview } from './embeds/website-preview';
import { XProfile, XProfiles } from './profiles/x-profile';
import { getAchievementComponents } from './achievement/components';
import { ResourceDisks } from '@/components/home/resources';
import type { AchievementDefinition } from '@/lib/content/model';
import type { MDXComponents } from 'mdx/types';
function Callout({ title, type = 'info', children }: { title?: ReactNode; type?: string; children?: ReactNode }) {
  const Icon = type === 'warning' || type === 'warn' || type === 'error' ? WarningIcon : InfoIcon;
  return <Alert data-type={type} role="note" className="rounded-sm"><Icon className={type === 'warning' || type === 'error' ? 'mt-[5px] text-review' : 'mt-[5px] text-foreground'} size={18} aria-hidden /><AlertDescription>{title && <AlertTitle>{title}</AlertTitle>}<div>{children}</div></AlertDescription></Alert>;
}
function isEmptyCellChildren(children: ReactNode): boolean {
  return Children.toArray(children).every((child) => {
    if (typeof child === 'string') return child.trim() === '';
    if (Array.isArray(child)) return isEmptyCellChildren(child);
    return false;
  });
}

function countHeaderColumns(sections: ReactNode): number {
  let columns = 0;
  Children.forEach(sections, (section) => {
    if (!isValidElement(section) || section.type !== TableHeader) return;
    const rows = Children.toArray((section.props as { children?: ReactNode }).children).filter((row): row is ReactElement => isValidElement(row) && row.type === TableRow);
    const first = rows[0];
    if (!first) return;
    columns = Math.max(columns, Children.toArray((first.props as { children?: ReactNode }).children).filter((cell) => isValidElement(cell) && cell.type === TableHead).length);
  });
  return columns;
}

// A table row authored with fewer cells than the header ends with empty cells after GFM
// padding. Merge that empty run into the previous cell so a row can span the remaining
// columns without raw HTML or a custom component.
function mergeTrailingEmptyCells(sections: ReactNode): ReactNode {
  const columns = countHeaderColumns(sections);
  if (!columns) return sections;
  return Children.map(sections, (section) => {
    if (!isValidElement(section) || section.type !== TableBody) return section;
    const body = section as ReactElement<{ children?: ReactNode }>;
    const rows = Children.map(body.props.children, (row) => {
      if (!isValidElement(row) || row.type !== TableRow) return row;
      const tr = row as ReactElement<{ children?: ReactNode }>;
      const cells = Children.toArray(tr.props.children).filter((cell): cell is ReactElement<ComponentProps<typeof TableCell>> => isValidElement(cell) && cell.type === TableCell);
      if (!cells.length) return row;
      let last = cells.length - 1;
      while (last >= 0 && isEmptyCellChildren(cells[last].props.children)) last -= 1;
      const lastCell = cells[last];
      if (!lastCell) return row;
      const span = columns - last;
      const current = typeof lastCell.props.colSpan === 'number' ? lastCell.props.colSpan : 1;
      if (span <= current) return row;
      const merged = cells.slice(0, last + 1).map((cell, index) => index === last ? cloneElement(cell, { colSpan: span }) : cell);
      return cloneElement(tr, {}, merged);
    });
    return cloneElement(body, {}, rows);
  });
}

function MarkdownTable({ className, children, ...props }: ComponentProps<'table'>) {
  return <div className="my-6"><Table {...props} className={cn('[&_th]:whitespace-nowrap [&_code]:whitespace-nowrap', className)}>{mergeTrailingEmptyCells(children)}</Table></div>;
}
function HighlightedText({ className, ...props }: ComponentProps<'mark'>) {
  return <mark {...props} className={cn('box-decoration-clone bg-transparent bg-[url(/images/highlight-stroke.svg)] bg-no-repeat px-0.5 text-inherit [background-size:100%_0.95em] [background-position:0_70%] [overflow-wrap:anywhere]', className)} />;
}
function StrongText({ className, ...props }: ComponentProps<'strong'>) {
  return <strong {...props} className={cn('text-brand', className)} />;
}
export function getMDXComponents(achievements: readonly AchievementDefinition[] = [], scope?: { prefix: string; pageUrl: string }): MDXComponents {
  const headingProps = (props: ComponentProps<'h1'>) => scope && props.id
    ? { ...props, id: `${scope.prefix}${props.id}`, 'data-heading-url': `${scope.pageUrl}#${props.id}` } : props;
  return {
    ...defaults, Steps, Step, Callout, JimmyNote, JimmyNoteAnchor, KeyTakeaway, ResourceDisks, Chat, ChatMessage, ChatThinking, ChatToolCall, InlineCitation, ChatMessageSequence, XEmbed, YouTube, WebsitePreview, XProfile, XProfiles, LLMGenerationDemo, MenuComparisonDemo, NewtonSecondLawDemo, AnimationDemo, FrontendLayersDemo, FrontendInspectorDemo, FrontendInspectorPractice, TokenizationDiagram, TokenProbabilityDiagram, LLMPretrainingOverview, LLMSingleRoundTrainingDemo, LLMMultiRoundTrainingDemo, HoverGardenDemo, MermaidDiagram, ...getAchievementComponents(achievements, scope?.prefix), pre: LocalizedCodeBlock,
    a: scope ? props => <LinkPreview {...props} href={props.href?.startsWith('#') ? `${scope.pageUrl}${props.href}` : props.href} /> : LinkPreview,
    ...(scope ? {
      JimmyNote: (props: ComponentProps<typeof JimmyNote>) => <JimmyNote {...props} anchor={`${scope.prefix}${props.anchor}`} />,
      JimmyNoteAnchor: (props: ComponentProps<typeof JimmyNoteAnchor>) => <JimmyNoteAnchor {...props} id={`${scope.prefix}${props.id}`} />,
    } : {}),
    mark: HighlightedText, strong: StrongText, table: MarkdownTable, thead: TableHeader, tbody: TableBody, tfoot: TableFooter,
    tr: TableRow, th: TableHead, td: TableCell, caption: TableCaption,
    h1: (props) => <Heading as="h1" {...headingProps(props)} />,
    h2: (props) => <Heading as="h2" {...headingProps(props)} />,
    h3: (props) => <Heading as="h3" {...headingProps(props)} />,
    h4: (props) => <Heading as="h4" {...headingProps(props)} />,
    h5: (props) => <Heading as="h5" {...headingProps(props)} />,
    h6: (props) => <Heading as="h6" {...headingProps(props)} />,
  };
}
