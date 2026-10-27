/**
 * [INPUT]: Native aside props, shared Alert parts, and cn class composition.
 * [OUTPUT]: JimmyNote with a gray surface, a dark Jimmy label, and rich Markdown content.
 * [POS]: Server-rendered author commentary registered by the shared MDX component map.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ComponentProps } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export function JimmyNote({ className, children, ...props }: ComponentProps<'aside'>) {
  return <Alert role="note" aria-label="Jimmy" {...props} variant="author" data-component="jimmy-note" className={cn('not-prose', className)}>
    <AlertTitle className="self-start bg-author-note-foreground px-1.5 py-0.5 text-xs leading-4 font-normal text-white" lang="en">Jimmy</AlertTitle>
    <AlertDescription className="block text-base leading-reading text-inherit [overflow-wrap:anywhere] [&>p+p]:mt-3 [&_a]:underline [&_a]:underline-offset-4">{children}</AlertDescription>
  </Alert>;
}
