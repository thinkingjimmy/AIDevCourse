'use client';
import { Fragment, useId, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { DemoFrame, Range, usePreviewWidth } from './controls';

const MIN = 16;
const MAX = 32;
// 14cqi puts both plateaus inside the 64–280px slider range, so the chart shows all three phases.
const FLUID = 14;
const RATIO = FLUID / 100;
const MIN_WIDTH = 64;
const CHART = { width: 280, height: 112, left: 34, right: 14, top: 14, bottom: 14 };

type Mode = 'minimum' | 'preferred' | 'maximum';

function clampState(width: number) {
  const preferred = width * RATIO;
  const size = Math.min(MAX, Math.max(MIN, preferred));
  const mode: Mode = preferred <= MIN ? 'minimum' : preferred >= MAX ? 'maximum' : 'preferred';
  return { preferred, size, mode };
}

export function ClampDemo() {
  const t = useTranslations('Vocabulary');
  const { ref, available } = usePreviewWidth(280);
  const [width, setWidth] = useState(150);
  const previewWidth = Math.min(width, available);
  const { mode } = clampState(previewWidth);
  const args = [['minimum', `${MIN}px`], ['preferred', `${FLUID}cqi`], ['maximum', `${MAX}px`]] as const;
  return <DemoFrame controls={<Range label={t('containerWidth')} min={MIN_WIDTH} max={available} value={previewWidth} unit="px" onChange={setWidth} />}>
    <div className="clamp-demo" ref={ref}>
      <div className="clamp-track">
        <div className="clamp-viewport" style={{ width: previewWidth, containerType: 'inline-size' }}>
          <div className="clamp-sample"><p lang="en" style={{ fontSize: `clamp(${MIN}px, ${FLUID}cqi, ${MAX}px)` }}>Aa</p></div>
        </div>
      </div>
      <ClampChart width={previewWidth} maxWidth={available} />
      <code className="clamp-formula" data-mode={mode}>
        clamp({args.map(([key, value], index) => <Fragment key={key}>
          <span data-arg={key} data-active={mode === key}>{value}</span>{index < args.length - 1 && ', '}
        </Fragment>)})
      </code>
    </div>
  </DemoFrame>;
}

function ClampChart({ width, maxWidth }: { width: number; maxWidth: number }) {
  const t = useTranslations('Vocabulary');
  const format = useFormatter();
  const id = useId();
  const { preferred, size, mode } = clampState(width);
  const { left, right, top, bottom } = CHART;
  const plotRight = CHART.width - right;
  const plotBottom = CHART.height - bottom;
  const wMax = Math.max(maxWidth, MIN_WIDTH + 1);
  const sLow = Math.min(MIN_WIDTH * RATIO, MIN) - 4;
  const sHigh = Math.max(wMax * RATIO, MAX) + 4;
  const x = (w: number) => left + (w - MIN_WIDTH) / (wMax - MIN_WIDTH) * (plotRight - left);
  const y = (s: number) => top + (sHigh - s) / (sHigh - sLow) * (plotBottom - top);
  const breaks = [MIN_WIDTH, MIN / RATIO, MAX / RATIO, wMax].filter(w => w >= MIN_WIDTH && w <= wMax);
  const actualPath = breaks.map(w => `${x(w)},${y(clampState(w).size)}`).join(' ');
  const px = (value: number) => `${format.number(value, { maximumFractionDigits: 1 })}px`;
  const dotX = x(width);
  // Keep labels off the curve: the line rises to the right of the dot and stays flat on the clamped side.
  const labelX = Math.min(Math.max(dotX, left + 14), plotRight - 14);
  const labelBelow = mode === 'maximum';
  // Show the rejected preferred value only once it separates from the actual dot.
  const showGhost = Math.abs(y(preferred) - y(size)) > 9;
  return <svg className="clamp-chart" viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img"
    aria-label={`${t('clampPreview.actual')} ${px(size)}. ${t(`clampPreview.${mode}State`)}`}>
    <clipPath id={`${id}-plot`}><rect x={left} y={0} width={plotRight - left} height={CHART.height} /></clipPath>
    {[MIN, MAX].map(value => <g key={value}>
      <line className="clamp-limit" x1={left} x2={plotRight} y1={y(value)} y2={y(value)} />
      <text className="clamp-tick" x={left - 6} y={y(value)} textAnchor="end" dominantBaseline="middle">{value}px</text>
    </g>)}
    <g clipPath={`url(#${id}-plot)`}>
      <line className="clamp-preferred" x1={x(MIN_WIDTH)} x2={x(wMax)} y1={y(MIN_WIDTH * RATIO)} y2={y(wMax * RATIO)} />
      <polyline className="clamp-actual" points={actualPath} />
    </g>
    {showGhost && <>
      <circle className="clamp-ghost" cx={dotX} cy={y(preferred)} r={3} />
      <text className="clamp-ghost-label" x={labelX} y={y(preferred) + (labelBelow ? -8 : 14)} textAnchor="middle">{px(preferred)}</text>
    </>}
    <circle className="clamp-dot" cx={dotX} cy={y(size)} r={4} />
    <text className="clamp-dot-label" x={mode === 'preferred' ? dotX - 7 : labelX} y={y(size) + (labelBelow ? 15 : -9)}
      textAnchor={mode === 'preferred' ? 'end' : 'middle'}>{px(size)}</text>
  </svg>;
}
