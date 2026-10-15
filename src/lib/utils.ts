/**
 * [INPUT]: Class values from component props and shadcn variants.
 * [OUTPUT]: One merged class string, with later Tailwind utilities winning.
 * [POS]: Shared by the shadcn UI primitives in src/components/ui.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
