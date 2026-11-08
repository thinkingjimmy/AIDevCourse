import { Children, cloneElement, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { Pre } from 'fumadocs-ui/components/codeblock';
import { useTranslations } from 'next-intl';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import type { CodeFold } from '@/lib/content/code-folds';

type CodeElement = ReactElement<ComponentProps<'code'>>;

export function FoldedCode({ folds, source, children, ...props }: ComponentProps<'pre'> & { folds: CodeFold[]; source: string }) {
  const t = useTranslations('Ui');
  const code = Children.toArray(children).find(child => isValidElement(child)) as CodeElement | undefined;
  const lines = code ? Children.toArray(code.props.children).filter(child =>
    isValidElement<{ className?: string }>(child) && child.props.className?.split(' ').includes('line')) : [];
  if (!code || lines.length !== source.split('\n').length) return <Pre {...props}>{children}</Pre>;
  const renderLines = (start: number, end: number) => <Pre {...props}>
    {cloneElement(code, { children: lines.slice(start, end).flatMap((line, index) => index ? ['\n', line] : [line]) })}
  </Pre>;
  const sections: ReactNode[] = [];
  const sourceLines = source.split('\n');
  let cursor = 0;
  for (const fold of folds) {
    if (cursor < fold.start - 1) sections.push(<div key={`before-${fold.start}`}>{renderLines(cursor, fold.start - 1)}</div>);
    sections.push(<details key={fold.start} data-slot="code-fold" className="group/code-fold">
      <summary className="sticky left-0 flex min-h-11 w-fit max-w-[100cqw] cursor-pointer list-none items-center gap-2 rounded-sm px-4 py-1 font-mono text-sm leading-reading text-brand hover:bg-brand/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
        <CaretRightIcon size={14} aria-hidden className="shrink-0 group-open/code-fold:rotate-90" />
        <span className="min-w-0 wrap-break-word">{sourceLines[fold.start - 1].trim()}</span>
        <span className="shrink-0 font-sans text-caption text-muted-foreground group-open/code-fold:hidden">{t('codeFoldLines', { count: fold.end - fold.start })}</span>
      </summary>
      {renderLines(fold.start, fold.end)}
    </details>);
    cursor = fold.end;
  }
  if (cursor < lines.length) sections.push(<div key="after">{renderLines(cursor, lines.length)}</div>);
  return <div className="min-w-full w-max [&_pre]:m-0 [&_pre]:rounded-none">{sections}</div>;
}
