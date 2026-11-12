'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { HandwrittenCallout } from '../annotations/handwritten-callout';
import { DemoFrame, Range, ToggleDemo } from './controls';

export function KerningDemo() {
  const t = useTranslations('Vocabulary');
  const [enabled, setEnabled] = useState(false);
  const pairSpacing = enabled ? '-0.09em' : 0;
  return <ToggleDemo label={t('terms.kerning.title')} value={enabled} onChange={setEnabled} note={t('kerningNote')}>
    <div className="kerning-words" lang="en" style={{ fontKerning: 'none' }}>
      <div><span style={{ marginRight: pairSpacing }}>A</span>IDe<span style={{ marginRight: pairSpacing }}>v</span>Course</div>
    </div>
  </ToggleDemo>;
}

export function TrackingDemo() {
  const t = useTranslations('Vocabulary');
  const locale = useLocale();
  const [spacing, setSpacing] = useState(0);
  const account = t('account').toLocaleUpperCase(locale);
  return <DemoFrame controls={<Range label={t('spacing')} value={spacing} min={0} max={0.2} step={0.01} unit="em" onChange={setSpacing} />}>
    <div className="tracking-example">
      <div className="tracking-menu">
        <p style={{ letterSpacing: `${spacing}em` }}>
          <span className="tracking-account-anchor" data-label={account}>
            <span className="tracking-account-label">{account}</span>
            <HandwrittenCallout label={t('lookHere')} />
          </span>
        </p>
        <div>{t('profile')}</div><div className="tracking-selected">{t('security')}</div><div>{t('notifications')}</div>
      </div>
    </div>
  </DemoFrame>;
}

export function LeadingDemo() {
  const t = useTranslations('Vocabulary');
  const [adjustedLeading, setAdjustedLeading] = useState<number>();
  const leading = adjustedLeading ?? 1.5;
  return <DemoFrame controls={<Range label={t('lineHeight')} value={leading} min={1.1} max={2.2} step={0.05} onChange={setAdjustedLeading}
    thumbContent={adjustedLeading === undefined && <HandwrittenCallout className="leading-callout" label={t('tryDraggingHere')} />} />}>
    <p className="demo-reading" style={{ lineHeight: leading }}>{t('readingText')}</p>
  </DemoFrame>;
}

type Point = readonly [number, number];
type Glyph = { width: number; shapes: readonly (readonly Point[])[] };

// Geometric glyphs on a 100-unit cap height, so the white space between shapes can be measured exactly.
const stems = (width: number): Point[][] => [[[0, 0], [16, 0], [16, 100], [0, 100]], [[width - 16, 0], [width, 0], [width, 100], [width - 16, 100]]];
const glyphs: Record<string, Glyph> = {
  M: { width: 86, shapes: [...stems(86), [[0, 0], [17, 0], [43, 68], [69, 0], [86, 0], [51, 96], [35, 96]]] },
  I: { width: 16, shapes: [[[0, 0], [16, 0], [16, 100], [0, 100]]] },
  A: { width: 80, shapes: [[[32, 0], [48, 0], [80, 100], [63, 100], [40, 27], [17, 100], [0, 100]], [[14, 64], [66, 64], [66, 78], [14, 78]]] },
  V: { width: 80, shapes: [[[0, 0], [17, 0], [40, 73], [63, 0], [80, 0], [48, 100], [32, 100]]] },
  N: { width: 70, shapes: [...stems(70), [[0, 0], [18, 0], [70, 100], [52, 100]]] },
};
// Straight pairs keep their gap in both modes; only diagonal pairs move.
const OPTICAL_WORD = 'MINIVAN';
const METRIC_GAP = 14;
const OPTICAL_GAP = 14;
const MIN_GAP = 6;
const SAMPLES = Array.from({ length: 51 }, (_, index) => Math.min(99.9, Math.max(0.1, index * 2)));

// Leftmost and rightmost ink of a glyph on each horizontal scanline.
function profile({ shapes }: Glyph) {
  return SAMPLES.map(y => {
    const xs = shapes.flatMap(shape => shape.flatMap(([x1, y1], index) => {
      const [x2, y2] = shape[(index + 1) % shape.length];
      return (y1 <= y && y < y2) || (y2 <= y && y < y1) ? [x1 + (y - y1) / (y2 - y1) * (x2 - x1)] : [];
    }));
    return [Math.min(...xs), Math.max(...xs)] as const;
  });
}

const opticalLayout = (() => {
  const letters = [...OPTICAL_WORD].map(letter => ({ letter, glyph: glyphs[letter], edges: profile(glyphs[letter]) }));
  const pairs = letters.slice(1).map((next, index) => SAMPLES.map((_, row) => next.edges[row][0] - letters[index].edges[row][1]));
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const advance = (steps: number[]) => steps.reduce<number[]>((origins, step) => [...origins, origins.at(-1)! + step], [0]);
  const metric = advance(letters.slice(0, -1).map(({ glyph }) => glyph.width + METRIC_GAP));
  // Equal average white space per pair, without letting any two shapes come closer than MIN_GAP.
  const optical = advance(pairs.map(rows => Math.max(OPTICAL_GAP - mean(rows), MIN_GAP - Math.min(...rows))));
  const width = metric.at(-1)! + letters.at(-1)!.glyph.width;
  return { letters, pairs, metric, optical, width, mean };
})();

function useTween(target: number, duration = 280) {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const from = current.current;
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = instant ? 1 : Math.min(1, (now - start) / duration);
      current.current = from + (target - from) * (1 - (1 - progress) ** 3);
      setValue(current.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export function OpticalKerningDemo() {
  const t = useTranslations('Vocabulary');
  const [enabled, setEnabled] = useState(false);
  const progress = useTween(enabled ? 1 : 0);
  const { letters, pairs, metric, optical, width, mean } = opticalLayout;
  const origins = metric.map((origin, index) => origin + (optical[index] - origin) * progress);
  const shift = (width - (origins.at(-1)! + letters.at(-1)!.glyph.width)) / 2;
  const gaps = pairs.map((rows, index) => mean(rows) + origins[index + 1] - origins[index]);
  const outline = (points: readonly Point[], x: number) => points.map(([px, py]) => `${px + x},${py}`).join(' ');
  return <ToggleDemo label={t('terms.optical-kerning.title')} value={enabled} onChange={setEnabled} adjusted>
    <svg className="optical-word" viewBox={`-4 -4 ${width + 8} 108`} role="img" aria-label={OPTICAL_WORD}
      data-spread={Math.round(Math.max(...gaps) - Math.min(...gaps))}>
      {pairs.map((_, index) => {
        const left = letters[index].edges.map(([, right], row) => `${right + origins[index] + shift},${SAMPLES[row]}`);
        const right = letters[index + 1].edges.map(([edge], row) => `${edge + origins[index + 1] + shift},${SAMPLES[row]}`).reverse();
        return <polygon key={index} className="optical-gap" points={[...left, ...right].join(' ')} />;
      })}
      <g className="optical-glyphs">
        {letters.map(({ letter, glyph }, index) => <g key={index} data-letter={letter}>
          {glyph.shapes.map((shape, part) => <polygon key={part} points={outline(shape, origins[index] + shift)} />)}
        </g>)}
      </g>
    </svg>
  </ToggleDemo>;
}

export function LineLengthDemo() {
  const t = useTranslations('Vocabulary');
  const [length, setLength] = useState(36);
  return <DemoFrame controls={<Range label={t('containerWidth')} value={length} min={18} max={60} unit="ch" onChange={setLength} />}>
    <p className="demo-reading demo-measure" style={{ width: `${length}ch` }}>{t('readingText')}</p>
  </DemoFrame>;
}
