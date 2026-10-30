import localFont from 'next/font/local';
import { trainingTarget } from './model';

// This local subset covers the annotation copy and digits; update its glyphs when changing the copy.
const handwriting = localFont({
  src: './comparison-handwriting.woff2',
  weight: '400',
  style: 'normal',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  fallback: ['Kaiti SC', 'STKaiti', 'KaiTi', 'serif'],
});

export function TrainingComparisonNote({ probability }: { probability: number }) {
  return <aside role="note" aria-label="这次预测与原文的差距" data-training-comparison-note
    className="mb-1 ml-auto flex w-44 max-w-full flex-col items-end pr-2 text-reading @min-[560px]/training:absolute @min-[560px]/training:right-0 @min-[560px]/training:bottom-full @min-[560px]/training:-mb-3">
    <p className={`${handwriting.className} w-full -rotate-3 text-lg leading-body font-normal [font-synthesis:none]`}>
      答案是「{trainingTarget}」，<br />却只给了 {probability}%<br />要提高它的概率
    </p>
    <svg viewBox="0 0 80 64" aria-hidden focusable="false" className="pointer-events-none h-14 w-18 shrink-0 select-none">
      <path d="M18 5 C12 25 24 45 61 49 M51 38 Q56 45 63 49 Q54 50 48 56"
        fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </aside>;
}
