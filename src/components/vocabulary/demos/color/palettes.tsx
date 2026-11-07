'use client';
import { useState, type CSSProperties } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { DemoFrame, DemoTabs, Range } from '../controls';

export function SemanticTokenDemo() {
  const t = useTranslations('Vocabulary.colorPreview');
  const [border, setBorder] = useState<'subtle' | 'strong'>('subtle');
  const color = border === 'subtle' ? '#e0e0e0' : '#7d8791';
  const style = { '--color-border-subtle': color } as CSSProperties;
  return <DemoTabs label={t('borderColor')} value={border} onChange={setBorder}
    options={(['subtle', 'strong'] as const).map(value => ({ value, label: t(value) }))} note={t('tokenNote')}>
    <div className="color-sample" style={style}>
      <div className="color-token-preview">
        <span className="color-token-status color-token-border">{t('inProgress')}</span>
        <strong>{t('project')}</strong>
        <div className="color-token-field color-token-border">{t('projectName')}</div>
        <span className="color-token-action color-token-border">{t('continue')}</span>
      </div>
      <code>--color-border-subtle<br />{color}</code>
    </div>
  </DemoTabs>;
}

export function ContrastDemo() {
  const t = useTranslations('Vocabulary.colorPreview');
  const format = useFormatter();
  const [gray, setGray] = useState(96);
  const channel = gray / 255;
  const luminance = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  const ratio = 1.05 / (luminance + 0.05);
  // Do not round a failing ratio up to the displayed AA threshold.
  const display = format.number(Math.floor(ratio * 100) / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <DemoFrame controls={<Range label={t('textLightness')} value={gray} min={0} max={255} onChange={setGray} />} note={t('contrastNote')}>
    <div className="color-contrast">
      <div className="color-contrast-specimen" style={{ color: `rgb(${gray} ${gray} ${gray})` }} aria-hidden>
        <span>Aa</span><span className="color-contrast-component">✓</span>
      </div>
      <output className="color-contrast-ratio">{display}:1</output>
      <div className="color-contrast-results">
        <span data-passes={ratio >= 4.5}>{t('bodyText')} · {t(ratio >= 4.5 ? 'pass' : 'fail')}</span>
        <span data-passes={ratio >= 3}>{t('largeText')} · {t(ratio >= 3 ? 'pass' : 'fail')}</span>
        <span data-passes={ratio >= 3}>{t('uiComponent')} · {t(ratio >= 3 ? 'pass' : 'fail')}</span>
      </div>
    </div>
  </DemoFrame>;
}

export function TintedNeutralDemo() {
  const t = useTranslations('Vocabulary.colorPreview');
  const [tone, setTone] = useState<'warm' | 'cool'>('warm');
  const hue = tone === 'warm' ? 70 : 250;
  return <DemoTabs label={t('neutralTone')} value={tone} onChange={setTone}
    options={(['warm', 'cool'] as const).map(value => ({ value, label: t(value) }))}>
    <div className="color-pair">
      <div><div className="color-disc color-pure-neutral" style={{ backgroundColor: '#808080' }} aria-hidden /><code>#808080</code></div>
      <div><div className="color-disc color-tinted-neutral" style={{ backgroundColor: `oklch(0.6 0.025 ${hue})` }} aria-hidden /><span>{t(tone)}</span></div>
    </div>
  </DemoTabs>;
}

export function SaturationDemo() {
  const t = useTranslations('Vocabulary.colorPreview');
  const [saturation, setSaturation] = useState(75);
  return <DemoFrame controls={<Range label={t('saturation')} value={saturation} min={0} max={100} unit="%" onChange={setSaturation} />} note={t('saturationNote')}>
    <div className="color-pair color-saturation-comparison">
      {[100, saturation].map((value, index) => <div key={index}>
        <div className="color-saturation-surface" aria-hidden><span style={{ backgroundColor: `hsl(265 ${value}% 65%)` }} /></div>
        <code>S {value}%</code>
      </div>)}
    </div>
  </DemoFrame>;
}

export function ChromaDemo() {
  const t = useTranslations('Vocabulary.colorPreview');
  const [tint, setTint] = useState(50);
  const alpha = 1 - tint / 100;
  const chroma = Number((0.16 * alpha).toFixed(3));
  const lightness = 70 + tint * 0.2;
  return <DemoFrame controls={<Range label={t('tintAmount')} value={tint} min={0} max={75} unit="%" onChange={setTint} />} note={t('chromaNote')}>
    <div className="color-pair color-chroma-comparison">
      <div><div className="color-chroma-surface" aria-hidden><span className="color-chroma-swatch" style={{ backgroundColor: `oklch(${lightness}% ${chroma} 30)` }} /></div><span>{t('chroma')}</span><code>C {chroma}</code></div>
      <div><div className="color-chroma-surface" aria-hidden><span className="color-opacity-swatch" style={{ backgroundColor: 'oklch(70% 0.16 30)', opacity: alpha }} /></div><span>{t('alpha')}</span><code>Alpha {Math.round(alpha * 100)}%</code></div>
    </div>
  </DemoFrame>;
}

const gradientStart = 'oklch(0.55 0.18 260)';
const gradientEnd = 'oklch(0.8 0.1 70)';

export function GradientDemo() {
  const t = useTranslations('Vocabulary.colorPreview');
  const [space, setSpace] = useState<'srgb' | 'oklch'>('srgb');
  return <DemoTabs label={t('interpolation')} value={space} onChange={setSpace}
    options={[{ value: 'srgb', label: 'sRGB' }, { value: 'oklch', label: 'OKLCH' }]} note={t('gradientNote')}>
    <div className="color-sample">
      <div className="color-gradient" style={{ backgroundImage: `linear-gradient(90deg in ${space}, ${gradientStart}, ${gradientEnd})` }} aria-hidden />
      <div className="color-gradient-stops">{(['start', 'middle', 'end'] as const).map((label, index) => <div key={label}>
        <span style={{ backgroundColor: `color-mix(in ${space}, ${gradientStart} ${100 - index * 50}%, ${gradientEnd})` }} aria-hidden />
        <span>{t(label)}</span>
      </div>)}</div>
    </div>
  </DemoTabs>;
}
