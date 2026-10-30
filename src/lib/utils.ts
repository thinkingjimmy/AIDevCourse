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
