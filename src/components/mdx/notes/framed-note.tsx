import type { ComponentProps, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type FramedNoteProps = ComponentProps<'aside'> & { label: string; signature: ReactNode };

export function FramedNote({ label, signature, className, children, ...props }: FramedNoteProps) {
  return <Alert role="note" aria-label={label} {...props} variant="author" className={cn('not-prose pt-0', className)}>
    <div data-slot="note-signature" className="relative -mx-1.5 flex w-fit max-w-[calc(100%+0.75rem)] -translate-y-1/2 items-center gap-2.5 bg-background px-1.5">
      {signature}
    </div>
    <AlertDescription className="mt-3 block text-base leading-reading text-inherit [overflow-wrap:anywhere] [&>p+p]:mt-3 [&_a]:underline [&_a]:underline-offset-4">{children}</AlertDescription>
  </Alert>;
}
