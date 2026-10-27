/**
 * [INPUT]: Component class values and custom typography names from styles/typography.css.
 * [OUTPUT]: Merged Tailwind classes that preserve custom font sizes independently of colors.
 * [POS]: Shared by the shadcn UI primitives in src/components/ui.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['caption', 'ui', 'title', 'display', 'hero', 'error', 'diagram-label', 'diagram-caption'],
      leading: ['display', 'heading', 'copy', 'body', 'reading', 'cjk'],
      tracking: ['heading', 'label'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
