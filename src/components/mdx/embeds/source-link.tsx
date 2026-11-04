import type { ReactNode } from 'react';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';
import { cn } from '@/lib/utils';

export function EmbedSource({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <figcaption className={cn('mt-1 text-sm leading-body text-muted-foreground', className)}>
    <a href={href} target="_blank" rel="noopener" className="inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-sm text-inherit underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
      {children}<ArrowUpRightIcon size={14} className="shrink-0" aria-hidden />
    </a>
  </figcaption>;
}
