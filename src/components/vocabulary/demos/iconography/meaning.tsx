'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { DemoFrame, DemoTabs } from '../controls';
import { IconGlyph, type GlyphName } from './glyph';

export function FilledOutlinedDemo() {
  const t = useTranslations('Vocabulary.iconPreview');
  const [active, setActive] = useState<GlyphName>('home');
  return <DemoFrame note={t('filledNote')}>
    <div className="icon-state-nav" role="group" aria-label={t('navigation')}>
      {(['home', 'heart', 'bookmark'] as const).map(name => <Button key={name} variant="ghost" size="icon-touch"
        aria-label={t(name)} aria-pressed={active === name} onClick={() => setActive(name)}>
        <IconGlyph name={name} filled={active === name} />
      </Button>)}
    </div>
  </DemoFrame>;
}

export function MeaningCollisionDemo() {
  const t = useTranslations('Vocabulary.iconPreview');
  const [mode, setMode] = useState('collision');
  return <DemoTabs label={t('meaningSystem')} value={mode} onChange={setMode}
    options={['collision', 'distinct'].map(value => ({ value, label: t(value) }))} note={t('collisionNote')}>
    <div className="icon-meaning-list">
      <div className="icon-label-sample"><IconGlyph name={mode === 'collision' ? 'star' : 'heart'} /><span>{t('favourite')}</span></div>
      <div className="icon-label-sample"><IconGlyph name="star" /><span>{t('rate')}</span></div>
    </div>
  </DemoTabs>;
}

export function ContextualSwapDemo() {
  const t = useTranslations('Vocabulary.iconPreview');
  const [favourite, setFavourite] = useState(false);
  const [saved, setSaved] = useState(false);
  return <DemoFrame note={t('swapNote')}>
    <div className="icon-toggle-list">
      <Button variant="outline" aria-pressed={favourite} onClick={() => setFavourite(value => !value)}>
        <IconGlyph name="heart" filled={favourite} /><span>{t(favourite ? 'favourited' : 'favourite')}</span>
      </Button>
      <Button variant="outline" aria-pressed={saved} onClick={() => setSaved(value => !value)}>
        <IconGlyph name="bookmark" filled={saved} /><span>{t(saved ? 'bookmarked' : 'bookmark')}</span>
      </Button>
    </div>
  </DemoFrame>;
}

export function MetaphorAccuracyDemo() {
  const t = useTranslations('Vocabulary.iconPreview');
  const [mode, setMode] = useState('iconsOnly');
  return <DemoTabs label={t('iconLabels')} value={mode} onChange={setMode}
    options={['iconsOnly', 'withLabels'].map(value => ({ value, label: t(value) }))} note={t('metaphorNote')}>
    <div className="icon-metaphors" data-labels={mode === 'withLabels'}>
      {(['save', 'phone', 'home'] as const).map(name => <div key={name}>
        <IconGlyph name={name} size={28} /><span>{t(name)}</span>
      </div>)}
    </div>
  </DemoTabs>;
}
