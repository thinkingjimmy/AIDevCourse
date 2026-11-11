'use client';

import { useId, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { BrowserIcon } from '@phosphor-icons/react/dist/ssr/Browser';
import { HardDrivesIcon } from '@phosphor-icons/react/dist/ssr/HardDrives';
import { Button } from '@/components/ui/button';
import { DemoFrame } from '../controls';

const files = ['index.html', 'style.css', 'script.js'];
const subscribeToHydration = () => () => {};
const actionClass = 'h-auto min-h-11 max-w-full whitespace-normal py-2 leading-snug';

export function StaticWebsiteDemo() {
  const t = useTranslations('ProgrammingVocabulary.demo');
  const id = useId();
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [deliveries, setDeliveries] = useState(1);
  const [clicks, setClicks] = useState(0);

  return <div className="static-site-demo" data-programming-demo="static-website" data-ready={ready}>
    <DemoFrame note={t('note')} controls={<div className="static-site-actions">
      <Button variant="brand-outline" className={actionClass} disabled={!ready} aria-controls={id} data-action="visit"
        onClick={() => { setDeliveries(count => count + 1); setClicks(0); }}>{t('visit')}</Button>
      <Button variant="ghost" className={actionClass} disabled={!ready} data-action="reset"
        onClick={() => { setDeliveries(1); setClicks(0); }}>{t('reset')}</Button>
    </div>}>
      <div className="static-site-example" id={id}>
        <div className="static-site-flow">
          <section className="static-site-server" aria-label={t('server')}>
            <p className="static-site-panel-title"><HardDrivesIcon size={20} aria-hidden />{t('server')}</p>
            <p className="static-site-panel-description">{t('prepared')}</p>
            <ul className="static-site-files">{files.map(file => <li key={file}><code>{file}</code></li>)}</ul>
            <p className="static-site-count" data-slot="server-deliveries">{t('deliveryCount', { count: deliveries })}</p>
          </section>
          <ArrowRightIcon className="static-site-arrow" size={24} aria-hidden />
          <section className="static-site-browser" aria-label={t('browser')}>
            <p className="static-site-panel-title"><BrowserIcon size={20} aria-hidden />{t('browser')}</p>
            <div className="static-site-preview">
              <p className="static-site-greeting" lang="en">Hello, world!</p>
              <p className="static-site-panel-description">{t('pageMessage')}</p>
              <Button variant="brand-outline" className={`${actionClass} [@media(scripting:none)]:hidden`} disabled={!ready}
                data-action="click" onClick={() => setClicks(count => count + 1)}>{t('click')}</Button>
              <p className="static-site-count" data-slot="browser-clicks">{t('clickCount', { count: clicks })}</p>
            </div>
          </section>
        </div>
        <p role="status" className="sr-only">{t('status', { deliveries, clicks })}</p>
        <noscript><p className="static-site-panel-description">{t('noJs')}</p></noscript>
      </div>
    </DemoFrame>
  </div>;
}
