/**
 * [INPUT]: Native aside props, Next.js Image, the local Jimmy avatar, shared Alert parts, and cn class composition.
 * [OUTPUT]: Full-width JimmyNote with the shared quotation border/shadow, an avatar/name signature embedded in its top edge, and rich Markdown content.
 * [POS]: Server-rendered author commentary registered by the shared MDX component map.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ComponentProps } from 'react';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export function JimmyNote({ className, children, ...props }: ComponentProps<'aside'>) {
  return <Alert role="note" aria-label="Jimmy" {...props} variant="author" data-component="jimmy-note" className={cn('not-prose', className)}>
    <div data-slot="note-signature" className="absolute start-2.5 top-0 flex -translate-y-1/2 items-center gap-2.5 bg-background px-1.5 sm:start-3.5">
      <Image src="/images/jimmy-avatar.png" alt="" width={32} height={32} sizes="2rem" className="size-8 shrink-0 rounded-full object-cover" />
      <AlertTitle className="text-sm leading-copy font-medium" lang="en">Jimmy</AlertTitle>
    </div>
    <AlertDescription className="block text-base leading-reading text-inherit [overflow-wrap:anywhere] [&>p+p]:mt-3 [&_a]:underline [&_a]:underline-offset-4">{children}</AlertDescription>
  </Alert>;
}
