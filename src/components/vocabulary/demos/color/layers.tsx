'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { DemoTabs, Range } from '../controls';

export function AlphaDemo() {
  const t = useTranslations('Vocabulary.colorPreview');
  const [alpha, setAlpha] = useState(50);
  const [surface, setSurface] = useState<'light' | 'tinted'>('tinted');
  return <DemoTabs label={t('surface')} value={surface} onChange={setSurface}
    options={(['light', 'tinted'] as const).map(value => ({ value, label: t(value) }))}
    controls={<Range label={t('alpha')} value={alpha} min={0} max={100} unit="%" onChange={setAlpha} />} note={t('alphaNote')}>
    <div className="color-border-comparison" data-surface={surface}>
      <div className="color-border-pair" aria-hidden>
        <span className="color-alpha-border" style={{ borderColor: `rgb(0 0 0 / ${alpha / 100})` }}>Aa</span>
        <span className="color-solid-border">Aa</span>
      </div>
      <div className="color-border-labels"><span>Alpha {alpha}%</span><code>#808080</code></div>
    </div>
  </DemoTabs>;
}

export function VisibilityDemo() {
  const t = useTranslations('Vocabulary.colorPreview');
  const [mode, setMode] = useState<'opacity' | 'visibility'>('opacity');
  const [clicks, setClicks] = useState(0);
  return <DemoTabs label={t('hideMethod')} value={mode} onChange={setMode}
    options={[{ value: 'opacity', label: 'opacity: 0' }, { value: 'visibility', label: 'visibility: hidden' }]} note={t('visibilityNote')}>
    <div className="color-visibility">
      <p>{t('tryArea')}</p>
      <div className="color-visibility-row">
        <span aria-hidden>A</span>
        <div className="color-hit-area">
          <Button className="color-hidden-button" aria-label={t('tryButton')}
            style={{ opacity: mode === 'opacity' ? 0 : 1, visibility: mode === 'visibility' ? 'hidden' : 'visible' }}
            onClick={() => setClicks(value => value + 1)}>B</Button>
        </div>
        <span aria-hidden>C</span>
      </div>
      <output aria-live="polite">{t('clickCount', { count: clicks })}</output>
    </div>
  </DemoTabs>;
}

export function DarkModeDemo() {
  const t = useTranslations('Vocabulary.colorPreview');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  return <DemoTabs label={t('theme')} value={theme} onChange={setTheme}
    options={(['light', 'dark'] as const).map(value => ({ value, label: t(value) }))} note={t('darkNote')}>
    <div className="color-theme" data-theme={theme}>
      <span>{t('canvas')}</span>
      <div className="color-theme-surface"><span>{t('surface')}</span>
        <div className="color-theme-raised"><span>{t('raised')}</span><strong>Aa</strong></div>
      </div>
    </div>
  </DemoTabs>;
}

export function BlendingDemo() {
  const t = useTranslations('Vocabulary.colorPreview');
  const [mode, setMode] = useState<'multiply' | 'screen' | 'overlay'>('multiply');
  return <DemoTabs label={t('blendMode')} value={mode} onChange={setMode}
    options={(['multiply', 'screen', 'overlay'] as const).map(value => ({ value, label: t(value) }))} note={t('blendNote')}>
    <div className="color-blend" aria-hidden>
      <div className="color-blend-base" /><div className="color-blend-top" style={{ mixBlendMode: mode }} />
    </div>
  </DemoTabs>;
}
