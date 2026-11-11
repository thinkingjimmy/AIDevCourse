'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DemoTabs, Range } from '../controls';
import { IconGlyph } from './glyph';

export function StrokeWeightDemo() {
  const t = useTranslations('Vocabulary.iconPreview');
  const [weight, setWeight] = useState(1.5);
  const [mode, setMode] = useState<'fixed' | 'scaled'>('fixed');
  return <DemoTabs label={t('weightSystem')} value={mode} onChange={setMode}
    options={(['fixed', 'scaled'] as const).map(value => ({ value, label: t(value) }))} note={t('strokeNote')}
    controls={<Range label={t('stroke')} value={weight} min={0.75} max={3} step={0.25} unit="px" onChange={setWeight} />}>
    <div className="icon-size-row" data-weight-mode={mode}>{[16, 24, 48].map(size => <div key={size}>
      <div className="icon-size-cell"><IconGlyph name="search" size={size} weight={weight} fixedWeight={mode === 'fixed'} /></div>
      <code>{size}px</code>
    </div>)}</div>
  </DemoTabs>;
}

export function OpticalCentreDemo() {
  const t = useTranslations('Vocabulary.iconPreview');
  const [adjusted, setAdjusted] = useState('coordinates');
  return <DemoTabs label={t('alignment')} value={adjusted} onChange={setAdjusted}
    options={['coordinates', 'optical'].map(value => ({ value, label: t(value) }))} note={t('opticalNote')}>
    <div className="icon-pair">{[false, adjusted === 'optical'].map((shift, index) => <div key={index}>
      <div className="icon-centre-frame"><IconGlyph name="play" size={48} filled pathTransform={`translate(${shift ? 2 : 0} 0)`} /></div>
      <span>{t(index === 0 ? 'coordinates' : adjusted)}</span>
    </div>)}</div>
  </DemoTabs>;
}

export function CapStyleDemo() {
  const t = useTranslations('Vocabulary.iconPreview');
  const [cap, setCap] = useState<'square' | 'round'>('square');
  return <DemoTabs label={t('capStyle')} value={cap} onChange={setCap}
    options={(['square', 'round'] as const).map(value => ({ value, label: t(value) }))} note={t('capNote')}>
    <div className="icon-cap-sample"><IconGlyph name="plus" size={24} weight={2} cap={cap} />
      <IconGlyph name="plus" size={112} weight={2} cap={cap} />
      <code>stroke-linecap: {cap}</code>
    </div>
  </DemoTabs>;
}

function PixelLogo({ aligned }: { aligned: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const origin = aligned ? 3.5 : 3.2;
  const weight = aligned ? 1 : 1.25;
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, 16, 16);
    context.strokeStyle = '#31564b';
    context.lineWidth = weight;
    context.strokeRect(origin, origin - 1, 8, 10);
    context.beginPath();
    context.moveTo(origin, origin + 3);
    context.lineTo(origin + 8, origin + 3);
    context.moveTo(origin + 4, origin + 3);
    context.lineTo(origin + 4, origin + 9);
    context.stroke();
  }, [origin, weight]);
  return <div className="icon-pixel-sample" data-aligned={aligned}>
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth={weight}>
      <rect x={origin} y={origin - 1} width="8" height="10" />
      <path d={`M${origin} ${origin + 3}h8m-4 0v6`} />
    </svg>
    <canvas ref={canvas} width="16" height="16" aria-hidden />
  </div>;
}

export function PixelHintingDemo() {
  const t = useTranslations('Vocabulary.iconPreview');
  const [mode, setMode] = useState('unhinted');
  return <DemoTabs label={t('pixelAlignment')} value={mode} onChange={setMode}
    options={['unhinted', 'hinted'].map(value => ({ value, label: t(value) }))} note={t('pixelNote')}>
    <div className="icon-pair"><div><PixelLogo aligned={false} /><span>{t('unhinted')}</span></div>
      <div><PixelLogo aligned={mode === 'hinted'} /><span>{t(mode)}</span></div>
    </div>
  </DemoTabs>;
}
