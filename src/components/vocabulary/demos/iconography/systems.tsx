'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DemoFrame, DemoTabs, Range } from '../controls';
import { IconGlyph } from './glyph';

export function IconLibraryDemo() {
  const t = useTranslations('Vocabulary.iconPreview');
  const [mode, setMode] = useState('mixed');
  const mixed = mode === 'mixed';
  return <DemoTabs label={t('iconSet')} value={mode} onChange={setMode}
    options={['mixed', 'consistent'].map(value => ({ value, label: t(value) }))} note={t('libraryNote')}>
    <div className="icon-library-row" data-icon-set={mode}>
      <IconGlyph name="home" size={mixed ? 20 : 24} weight={mixed ? 1 : 1.5} />
      <IconGlyph name="search" size={24} weight={mixed ? 2.75 : 1.5} />
      <IconGlyph name="folder" size={mixed ? 28 : 24} weight={mixed ? 1 : 1.5} cap={mixed ? 'square' : 'round'} strokeLinejoin={mixed ? 'miter' : 'round'} />
    </div>
  </DemoTabs>;
}

const sizes = [12, 16, 20, 24, 48] as const;
type IconSize = typeof sizes[number];
const sizeDrawings: Record<IconSize, { weight: number; path: string }> = {
  12: { weight: 1, path: 'M1.5 5 6 1.5 10.5 5v5.5h-9Z' },
  16: { weight: 1, path: 'M2.5 6.5 8 2l5.5 4.5v7H10v-5H6v5H2.5Z' },
  20: { weight: 1.5, path: 'M2.75 8.25 10 2.5l7.25 5.75v9h-5v-6h-4.5v6h-5Z' },
  24: { weight: 1.5, path: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z' },
  48: { weight: 2.5, path: 'M6 20 24 6l18 14v22H30V28H18v14H6Z' },
};

export function IconSizeSystemDemo() {
  const t = useTranslations('Vocabulary.iconPreview');
  const [size, setSize] = useState<IconSize>(16);
  const drawing = sizeDrawings[size];
  return <DemoTabs label={t('iconSize')} value={String(size)} onChange={value => setSize(Number(value) as IconSize)}
    options={sizes.map(value => ({ value: String(value), label: `${value}px` }))} note={t('sizeNote')}>
    <div className="icon-pair">
      <div><div className="icon-size-frame"><IconGlyph name="home" size={size} /></div><span>{t('master')}</span></div>
      <div><div className="icon-size-frame"><svg className="icon-size-drawing" width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        aria-hidden fill="none" stroke="currentColor" strokeWidth={drawing.weight} strokeLinecap="round" strokeLinejoin="round">
        <path d={drawing.path} />
      </svg></div><span>{t('sizeAdjusted')}</span></div>
    </div>
  </DemoTabs>;
}

export function BreathingRoomDemo() {
  const t = useTranslations('Vocabulary.iconPreview');
  const [gap, setGap] = useState(7);
  return <DemoFrame note={t('gapNote')} controls={<Range label={t('gap')} value={gap} min={0} max={16} unit="px" onChange={setGap} />}>
    <div className="icon-label-sample" style={{ gap }}><IconGlyph name="folder" /><span>{t('newFolder')}</span></div>
  </DemoFrame>;
}

export function UnifiedWeightDemo() {
  const t = useTranslations('Vocabulary.iconPreview');
  const [weight, setWeight] = useState(0.75);
  return <DemoFrame note={t('unifiedNote')} controls={<Range label={t('stroke')} value={weight} min={0.75} max={3} step={0.25} unit="px" onChange={setWeight} />}>
    <div className="icon-weight-comparison">
      <div className="icon-label-sample"><IconGlyph name="folder" /><span>{t('newFolder')}</span></div>
      <div className="icon-label-sample icon-bold-label"><IconGlyph name="folder" weight={weight} /><span>{t('newFolder')}</span></div>
    </div>
  </DemoFrame>;
}
