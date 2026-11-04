import type { ComponentProps } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { NoteEntry } from './note-entry';
import { NoteAuthor } from './note-author';

type JimmyNoteProps = ComponentProps<'aside'> & { anchor: string; noteNumber: string; embedOnly?: boolean };

export function JimmyNote({ anchor, noteNumber, embedOnly = false, children, className, ...props }: JimmyNoteProps) {
  const t = useTranslations('Ui');
  const description = t('noteNumber', { number: noteNumber });
  const card = <aside {...props} id={`jimmy-note-${anchor}`} role="note" aria-label={embedOnly ? description : 'Jimmy'} aria-describedby={`jimmy-note-number-${anchor}`} tabIndex={0}
    data-component="jimmy-note" data-note-variant={embedOnly ? 'embed' : 'text'} className={cn(
      'not-prose text-sm leading-body text-reading [overflow-wrap:anywhere]',
      embedOnly
        ? 'p-0 [[data-slot=jimmy-note-popover]_&]:max-h-[var(--note-max-height)] [[data-slot=jimmy-note-popover]_&]:overflow-y-auto [[data-slot=jimmy-note-popover]_&]:overscroll-contain'
        : 'max-h-[var(--note-max-height,calc(100svh-3.5rem))] overflow-y-auto overscroll-contain rounded-sm border-(length:--note-line-width) border-note-connector bg-background p-2 shadow-[3px_3px_0_var(--color-note-highlight)]',
      className,
    )}>
    <span id={`jimmy-note-number-${anchor}`} data-slot="note-description" className="sr-only">{description}</span>
    {!embedOnly && <NoteAuthor />}
    <div data-slot="note-body" className={cn('[&>p]:m-0 [&>p+p]:mt-3 [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_li+li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5', embedOnly && '[&>[data-embed]]:my-0 [&>[data-embed]+[data-embed]]:mt-3')}>{children}</div>
  </aside>;

  return <>
    <NoteEntry anchor={anchor}>{card}</NoteEntry>
    <noscript><div className="my-6">{card}</div></noscript>
  </>;
}
