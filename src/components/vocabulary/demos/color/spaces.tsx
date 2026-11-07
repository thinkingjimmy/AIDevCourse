'use client';
import { useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { DemoFrame, DemoTabs, Range } from '../controls';

export function SrgbDemo() {
  const t = useTranslations('Vocabulary.colorPreview');
  const [channels, setChannels] = useState([64, 128, 192]);
  const hex = `#${channels.map(value => value.toString(16).padStart(2, '0')).join('')}`;
  return <DemoFrame controls={<>{(['red', 'green', 'blue'] as const).map((channel, index) =>
    <Range key={channel} label={`${t(channel)} · ${'RGB'[index]}`} value={channels[index]} min={0} max={255}
      onChange={value => setChannels(previous => previous.map((channel, position) => position === index ? value : channel))} />)}</>}>
    <div className="color-sample">
      <div className="color-swatch color-rgb-swatch" style={{ backgroundColor: `rgb(${channels.join(' ')})` }} aria-hidden />
      <code>{hex}</code>
    </div>
  </DemoFrame>;
}

export function P3Demo() {
  const t = useTranslations('Vocabulary.colorPreview');
  const [color, setColor] = useState<'red' | 'green'>('red');
  const channels = color === 'red' ? '1 0.2 0.1' : '0.1 0.85 0.3';
  const style = { '--sample-srgb': `color(srgb ${channels})`, '--sample-p3': `color(display-p3 ${channels})` } as CSSProperties;
  return <DemoTabs label={t('sampleColor')} value={color} onChange={setColor}
    options={(['red', 'green'] as const).map(value => ({ value, label: t(value) }))} note={t('p3Note')}>
    <div className="color-pair" style={style}>
      <div><div className="color-disc color-p3-standard" aria-hidden /><span lang="en">sRGB</span></div>
      <div><div className="color-disc color-p3-wide" aria-hidden /><span lang="en">Display P3</span></div>
    </div>
  </DemoTabs>;
}

export function OklchDemo() {
  const t = useTranslations('Vocabulary.colorPreview');
  const [lightness, setLightness] = useState(65);
  return <DemoFrame note={t('oklchNote')} controls={
    <Range label={`${t('lightness')} · L`} value={lightness} min={55} max={80} unit="%" onChange={setLightness} />
  }>
    <div className="color-lightness-comparison">
      {(['hsl', 'oklch'] as const).map(space => <div key={space} data-space={space}>
        <code>{space.toUpperCase()} · L {lightness}%</code>
        <div className="color-palette" aria-hidden>{[20, 85, 145, 230, 305].map(hue => <span key={hue}
          style={{ backgroundColor: space === 'hsl' ? `hsl(${hue} 70% ${lightness}%)` : `oklch(${lightness}% 0.09 ${hue})` }} />)}</div>
      </div>)}
    </div>
  </DemoFrame>;
}
