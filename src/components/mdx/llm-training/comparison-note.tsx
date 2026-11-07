import localFont from 'next/font/local';
import { useLocale } from 'next-intl';
import { useTrainingCopy } from './shared';

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
  const { t, target } = useTrainingCopy();
  const chinese = useLocale() === 'zh';
  return <aside role="note" aria-label={t('comparisonLabel')} data-training-comparison-note
    className={`mb-1 ml-auto flex max-w-full flex-col items-end pr-2 text-reading ${chinese ? 'w-44 @min-[560px]/training:absolute @min-[560px]/training:right-0 @min-[560px]/training:bottom-full @min-[560px]/training:-mb-3' : 'w-80'}`}>
    <p className={`w-full text-lg leading-body font-normal ${chinese ? `${handwriting.className} -rotate-3 [font-synthesis:none]` : 'italic'}`}>
      {t('comparisonAnswer', { target })}<br />{t('comparisonProbability', { probability })}<br />{t('comparisonAction')}
    </p>
    <svg viewBox="0 0 80 64" aria-hidden focusable="false" className="pointer-events-none h-14 w-18 shrink-0 select-none">
      <path d="M18 5 C12 25 24 45 61 49 M51 38 Q56 45 63 49 Q54 50 48 56"
        fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </aside>;
}
