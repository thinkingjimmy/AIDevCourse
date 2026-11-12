import localFont from 'next/font/local';
import { cn } from '@/lib/utils';

const handwriting = localFont({
  src: './tracking-handwriting.woff2',
  weight: '400',
  style: 'normal',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  fallback: ['cursive'],
});

export function HandwrittenCallout({ label, className }: { label: string; className?: string }) {
  return <span className={cn('handwritten-callout', className)}>
    <span className={`${handwriting.className} [font-synthesis:none]`}>{label}</span>
    <svg viewBox="0 0 128 56" aria-hidden focusable="false">
      <path d="M80 12 C70 29 53 23 37 31 S16 48 0 56 M9 46 L0 56 L13 55" />
    </svg>
  </span>;
}
