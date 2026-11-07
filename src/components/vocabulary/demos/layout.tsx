'use client';
import { Fragment, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { DemoTabs, DemoFrame, Range, ToggleDemo, usePreviewWidth } from './controls';
import { ProfilePreview } from './profile-preview';

export function TypeScaleDemo() {
  const t = useTranslations('Vocabulary');
  const format = useFormatter();
  const [ratio, setRatio] = useState(1.25);
  const sizes = [16 * ratio ** 3, 16 * ratio, 16];
  return <DemoFrame controls={<Range label={t('ratio')} value={ratio} min={1.1} max={1.5} step={0.01} onChange={setRatio} />}>
    <div className="type-scale-sample">
      {(['scaleTitle', 'scaleSubtitle', 'bodyLabel'] as const).map((key, index) => <Fragment key={key}>
        <span className="type-scale-size">{format.number(sizes[index], { maximumFractionDigits: 2 })} px</span>
        <p style={{ fontSize: sizes[index] }}>{t(key)}</p>
      </Fragment>)}
    </div>
  </DemoFrame>;
}

export function OverflowDemo() {
  const t = useTranslations('Vocabulary');
  const [mode, setMode] = useState<'ellipsis' | 'wrap'>('ellipsis');
  const [width, setWidth] = useState(230);
  const { ref, available } = usePreviewWidth(340);
  const previewWidth = Math.min(width, available);
  return <DemoTabs label={t('terms.text-overflow.title')} value={mode} onChange={setMode}
    options={(['ellipsis', 'wrap'] as const).map(value => ({ value, label: t(value) }))}
    controls={<Range label={t('containerWidth')} min={Math.min(160, available)} max={available} value={previewWidth} unit="px" onChange={setWidth} />}>
    <div className="overflow-demo" ref={ref}>
      <div className="profile-width-preview" style={{ width: previewWidth }}>
        <ProfilePreview className="overflow-sample" name={t('overflowProfile.name')} subtitle={t('overflowProfile.role')} textOverflow={mode}>
          <p className={`overflow-bio m-0 text-sm leading-body ${mode === 'ellipsis' ? 'truncate' : 'whitespace-normal'}`} title={t('overflowProfile.bio')}>{t('overflowProfile.bio')}</p>
        </ProfilePreview>
      </div>
    </div>
  </DemoTabs>;
}

export function HyphenationDemo() {
  const t = useTranslations('Vocabulary');
  const [enabled, setEnabled] = useState(false);
  return <ToggleDemo label={t('terms.hyphenation.title')} value={enabled} onChange={setEnabled}>
    <p className="hyphenation-sample" lang="en" style={{ hyphens: enabled ? 'manual' : 'none' }}>Thoughtful ty­pog­ra­phy makes extra­or­di­nary in­ter­ac­tions feel un­der­stand­able.</p>
  </ToggleDemo>;
}

export function WidowDemo() {
  const t = useTranslations('Vocabulary');
  const [adjusted, setAdjusted] = useState(false);
  // Use whole English words to demonstrate the same widow in every locale.
  const biography = 'I build simple digital tools that help people get things done with less effort every day.';
  return <ToggleDemo label={t('terms.widow.title')} value={adjusted} onChange={setAdjusted} adjusted>
    <ProfilePreview className="max-w-56" subtitle={t('widowProfile.role')}>
      <p className="widow-sample" lang="en" style={{ textWrap: adjusted ? 'balance' : 'wrap' }}>{biography}</p>
    </ProfilePreview>
  </ToggleDemo>;
}

export function OrphanDemo() {
  const t = useTranslations('Vocabulary');
  const [fixed, setFixed] = useState(false);
  const firstLine = <p className="orphan-first">{t('subheading')}</p>;
  return <ToggleDemo label={t('terms.orphan.title')} value={fixed} onChange={setFixed} adjusted>
    <div className="orphan-pages">
      <div><span>{t('firstPage')}</span><div className="orphan-placeholder" aria-hidden />{!fixed && firstLine}</div>
      <div><span>{t('secondPage')}</span>{fixed && firstLine}<p className="orphan-following">{t('readingText')}</p></div>
    </div>
  </ToggleDemo>;
}
