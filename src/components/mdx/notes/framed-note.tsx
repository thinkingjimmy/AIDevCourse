import type { ComponentProps, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type FramedNoteProps = ComponentProps<'aside'> & { label: string; signature: ReactNode };

export function FramedNote({ label, signature, className, children, ...props }: FramedNoteProps) {
  return <Alert role="note" aria-label={label} {...props} variant="author" className={cn('not-prose pt-0', className)}>
    <div data-slot="note-signature" className="relative -mx-1.5 flex w-fit max-w-[calc(100%+0.75rem)] -translate-y-1/2 items-center gap-2.5 bg-background px-1.5">
      {signature}
    </div>
    <AlertDescription className={cn(
      'mt-3 block text-base leading-reading text-inherit [overflow-wrap:anywhere] [&>p+p]:mt-3 [&_a]:underline [&_a]:underline-offset-4',
      '[&_ul]:list-disc [&_ol]:list-decimal [&_:is(ul,ol)]:my-3 [&_:is(ul,ol)]:ps-6 [&_li+li]:mt-1 [&_li_:is(ul,ol)]:my-1 [&>:first-child]:mt-0 [&>:last-child]:mb-0',
    )}>{children}</AlertDescription>
  </Alert>;
}
