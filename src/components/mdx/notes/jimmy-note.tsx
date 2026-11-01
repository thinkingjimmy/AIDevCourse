import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { NoteEntry } from './note-entry';
import { NoteAuthor } from './note-author';

type JimmyNoteProps = ComponentProps<'aside'> & { anchor: string; noteNumber: string };

export function JimmyNote({ anchor, noteNumber, children, className, ...props }: JimmyNoteProps) {
  const card = <aside {...props} id={`jimmy-note-${anchor}`} role="note" aria-label="Jimmy" aria-describedby={`jimmy-note-number-${anchor}`} tabIndex={0}
    data-component="jimmy-note" className={cn('not-prose max-h-[var(--note-max-height,calc(100svh-3.5rem))] overflow-y-auto overscroll-contain rounded-none border-(length:--note-line-width) border-note-connector bg-background p-2 text-sm leading-body text-reading shadow-[3px_3px_0_var(--color-note-highlight)] [overflow-wrap:anywhere]', className)}>
    <NoteAuthor anchor={anchor} noteNumber={noteNumber} />
    <div data-slot="note-body" className="[&>p]:m-0 [&>p+p]:mt-3 [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded-xs [&_code]:bg-muted [&_code]:px-1 [&_li+li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
  </aside>;

  return <>
    <NoteEntry anchor={anchor}>{card}</NoteEntry>
    <noscript><div className="my-6">{card}</div></noscript>
  </>;
}
