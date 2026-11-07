'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { DemoTabs, DemoFrame, Range, ToggleDemo, usePreviewWidth } from './controls';

export function WeightDemo({ variable = false }: { variable?: boolean }) {
  const t = useTranslations('Vocabulary');
  const [weight, setWeight] = useState(400);
  return <DemoFrame controls={<Range label={t('weight')} min={100} max={900} step={variable ? 1 : 100} value={weight} onChange={setWeight} />}
    note={variable ? undefined : t('weightNote')}>
    {variable ? <div className="weight-sample" lang="en" style={{ fontWeight: weight, fontVariationSettings: `"wght" ${weight}` }}>Aa<span>Make it real.</span></div> :
      <Card className="w-full max-w-64 rounded-xl shadow-sm">
        <CardContent className="p-4">
          <p className="m-0 mb-3 text-xs text-muted-foreground">{t('weightPreview.label')}</p>
          <p className="weight-title m-0 mb-2 text-xl leading-snug" style={{ fontWeight: weight, fontVariationSettings: `"wght" ${weight}` }}>{t('weightPreview.title')}</p>
          <p className="weight-body m-0 text-sm font-normal leading-body text-reading">{t('weightPreview.body')}</p>
        </CardContent>
      </Card>}
  </DemoFrame>;
}

export function XHeightDemo() {
  const t = useTranslations('Vocabulary');
  const [font, setFont] = useState('Geist');
  const [height, setHeight] = useState<number>();
  const sample = useRef<HTMLDivElement>(null);
  const glyph = 'x';
  const family = font === 'Geist' ? 'var(--font-geist), sans-serif'
    : font === 'Arial' ? 'Arial, sans-serif' : 'Georgia, serif';
  useEffect(() => {
    if (!sample.current) return;
    let active = true;
    const canvasFont = `96px ${getComputedStyle(sample.current).fontFamily}`;
    void document.fonts.load(canvasFont, 'Hx').then(() => {
      if (!active || !sample.current) return;
      const context = document.createElement('canvas').getContext('2d');
      if (!context) return;
      context.font = canvasFont;
      setHeight(Math.round(context.measureText(glyph).actualBoundingBoxAscent));
    });
    return () => { active = false; };
  }, [font, glyph]);
  const preview = <div className="metrics-sample" ref={sample} style={{ fontFamily: family }}>
    <p className="metrics-label">{height !== undefined ? t('heightLabel', { value: height }) : '\u00a0'}</p>
    <div className="metrics-plot">
      <svg width="100%" height="144" aria-label="Hx" role="img"><text x="50%" y="112" textAnchor="middle" fontSize="96" fill="currentColor">Hx</text></svg>
      <span className="metrics-baseline"><span>{t('baseline')}</span></span>
      {height !== undefined && <span className="metrics-guide" style={{ top: 112 - height }} />}
    </div>
  </div>;
  return <DemoTabs label={t('font')} value={font} onChange={setFont}
    options={['Geist', 'Georgia', 'Arial'].map(value => ({ value, label: value }))} note={t('metricsNote')}>{preview}</DemoTabs>;
}

type CapLayout = {
  firstSize: number; matchedSize: number; firstHeight: number; firstX: number; secondX: number;
};
const comparisonFamily = '"Courier New", monospace';

export function CapHeightDemo() {
  const t = useTranslations('Vocabulary');
  const [aligned, setAligned] = useState(false);
  const { ref, available } = usePreviewWidth(240);
  const [layout, setLayout] = useState<CapLayout>();
  useEffect(() => {
    let active = true;
    const referenceFamily = `${getComputedStyle(document.documentElement).getPropertyValue('--font-geist')}, sans-serif`;
    void Promise.all([
      document.fonts.load(`100px ${referenceFamily}`, 'New'),
      document.fonts.load(`100px ${comparisonFamily}`, 'Day'),
    ]).then(() => {
      if (!active) return;
      const context = document.createElement('canvas').getContext('2d');
      if (!context) return;
      const measure = (size: number, family: string, word: string) => {
        context.font = `${size}px ${family}`;
        return context.measureText(word);
      };
      const first = measure(100, referenceFamily, 'New');
      const second = measure(100, comparisonFamily, 'Day');
      const ratio = first.actualBoundingBoxAscent / second.actualBoundingBoxAscent;
      const firstSize = Math.min(48, (available - 24) / ((first.width + second.width * ratio) / 100));
      const reference = measure(firstSize, referenceFamily, 'New');
      let matchedSize = firstSize * ratio;
      // Refine at the rendered size to account for font hinting and rounding.
      for (let step = 0; step < 2; step++) {
        const height = measure(matchedSize, comparisonFamily, 'Day').actualBoundingBoxAscent;
        matchedSize *= reference.actualBoundingBoxAscent / height;
      }
      const secondWidth = Math.max(measure(firstSize, comparisonFamily, 'Day').width, measure(matchedSize, comparisonFamily, 'Day').width);
      const firstX = (available - reference.width - 14 - secondWidth) / 2;
      setLayout({ firstSize, matchedSize, firstHeight: reference.actualBoundingBoxAscent, firstX, secondX: firstX + reference.width + 14 });
    });
    return () => { active = false; };
  }, [available]);
  return <ToggleDemo label={t('terms.cap-height.title')} value={aligned} onChange={setAligned}>
    <div className="metrics-sample" ref={ref}>
      <div className="metrics-plot">
        <svg width="100%" height="144" role="img" aria-label="New (Geist), Day (Courier New)">
          {layout && <>
            <g fontSize="12" fontFamily="var(--font-site-sans)" fill="var(--color-muted-foreground)" aria-hidden="true">
              <text x={layout.firstX} y="52">Geist</text><text x={layout.secondX} y="52">Courier New</text>
            </g>
            <text className="cap-height-reference" x={layout.firstX} y="112" fontSize={layout.firstSize} fontFamily="var(--font-geist), sans-serif" fill="currentColor">New</text>
            <text className="cap-height-comparison" x={layout.secondX} y="112" fontSize={aligned ? layout.matchedSize : layout.firstSize} fontFamily={comparisonFamily} fill="currentColor">Day</text>
          </>}
        </svg>
        <span className="metrics-baseline" aria-hidden="true" />
        {layout && <span className="metrics-guide" style={{ top: 112 - layout.firstHeight }} />}
      </div>
    </div>
  </ToggleDemo>;
}

export function LigatureDemo() {
  const t = useTranslations('Vocabulary');
  const [enabled, setEnabled] = useState(false);
  return <ToggleDemo label={t('terms.ligature.title')} value={enabled} onChange={setEnabled}>
    <div className="ligature-sample" lang="en" aria-label="fi fl"><span>{enabled ? 'ﬁ' : 'fi'}</span><span>{enabled ? 'ﬂ' : 'fl'}</span></div>
  </ToggleDemo>;
}

export function SmoothingDemo() {
  const t = useTranslations('Vocabulary');
  const [enabled, setEnabled] = useState(false);
  return <ToggleDemo label={t('terms.font-smoothing.title')} value={enabled} onChange={setEnabled} note={t('smoothingNote')}>
    <div className="smoothing-sample" style={{ WebkitFontSmoothing: enabled ? 'antialiased' : 'auto', MozOsxFontSmoothing: enabled ? 'grayscale' : 'auto' } as CSSProperties}>
      <span lang="en">Aa</span><p>{t('headline')}</p>
    </div>
  </ToggleDemo>;
}

export function FontStackDemo() {
  const t = useTranslations('Vocabulary');
  const [font, setFont] = useState('sans-serif');
  return <DemoTabs label={t('font')} value={font} onChange={setFont}
    options={['sans-serif', 'serif', 'monospace'].map((value, index) => ({ value, label: t(['sans', 'serif', 'mono'][index]) }))}>
    <div className="font-stack-sample"><span lang="en" style={{ fontFamily: `"Dictionary Missing Font", ${font}` }}>The quick<br />brown fox.</span><code>{`"Dictionary Missing Font", ${font}`}</code></div>
  </DemoTabs>;
}
