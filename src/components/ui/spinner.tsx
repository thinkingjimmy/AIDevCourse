/**
 * [INPUT]: Native SVG props, Phosphor SpinnerGapIcon, and shared class composition.
 * [OUTPUT]: Spinner with shadcn-style sizing and reduced-motion support.
 * [POS]: Shared loading indicator used by the article chat thinking state.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ComponentProps } from 'react';
import { SpinnerGapIcon } from '@phosphor-icons/react/dist/ssr/SpinnerGap';
import { cn } from '@/lib/utils';

export function Spinner({ className, ...props }: ComponentProps<'svg'>) {
  return <SpinnerGapIcon role="status" aria-label="Loading" data-slot="spinner" {...props} className={cn('size-4 motion-safe:animate-spin motion-reduce:animate-none', className)} />;
}
