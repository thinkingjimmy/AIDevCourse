'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { parseXUrl, type EmbedProps } from '@/lib/embeds/urls';
import { EmbedSource } from './source-link';
import { loadXWidgets } from './x-widgets';

export function XEmbed({ url, title }: EmbedProps) {
  const locale = useLocale();
  const t = useTranslations('Ui');
  const post = parseXUrl(url);
  if (!post) throw new Error('XEmbed requires a valid HTTPS X post URL');
  return <PostEmbed key={`${post.id}:${locale}:${title ?? ''}`} {...post} locale={locale} title={title?.trim() || t('xEmbedTitle')} />;
}

function PostEmbed({ id, source, title, locale }: { id: string; source: string; title: string; locale: string }) {
  const t = useTranslations('Ui');
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'pending' | 'loading' | 'ready' | 'unavailable'>('pending');

  useEffect(() => {
    const target = host.current!;
    let active = true;
    let started = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let observer: IntersectionObserver | undefined;
    const unavailable = () => {
      if (!active) return;
      active = false;
      target.replaceChildren();
      setState('unavailable');
    };
    const start = async () => {
      if (started || !active) return;
      started = true;
      observer?.disconnect();
      setState('loading');
      timer = setTimeout(unavailable, 15000);
      // Each request owns a disposable target, so late SDK writes cannot restore a removed post.
      const container = document.createElement('div');
      target.append(container);
      try {
        const api = await loadXWidgets();
        if (!active) return;
        const element = await api.widgets.createTweet(id, container, { lang: locale === 'zh' ? 'zh-cn' : locale, dnt: true, theme: 'light', align: 'center' });
        if (!active) { container.remove(); return; }
        if (!element || !container.contains(element)) { unavailable(); return; }
        const frame = element instanceof HTMLIFrameElement ? element : element.querySelector('iframe');
        if (frame) frame.title = title;
        setState('ready');
      } catch { unavailable(); }
      finally { clearTimeout(timer); }
    };
    if (typeof IntersectionObserver === 'undefined') queueMicrotask(start);
    else {
      observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) void start(); }, { rootMargin: '300px' });
      observer.observe(target);
    }
    return () => {
      active = false;
      observer?.disconnect();
      clearTimeout(timer);
      target.replaceChildren();
    };
  }, [id, locale, title]);

  return <figure data-embed="x" data-state={state} aria-label={title} className="not-prose mx-auto my-8 w-full min-w-0 max-w-[550px]">
    <div aria-busy={state === 'pending' || state === 'loading'} className="grid min-h-[250px] w-full [@media(scripting:none)]:hidden">
      <div ref={host} className="min-w-0 [grid-area:1/1] [&_iframe]:max-w-full [&_.twitter-tweet]:my-0!" />
      {state !== 'ready' && <p role="status" className="m-0 flex min-h-[250px] items-center justify-center rounded-sm border border-border bg-muted p-6 text-center text-sm leading-body text-reading [grid-area:1/1]">
        {state === 'unavailable' ? t('embedUnavailable') : t('embedLoading')}
      </p>}
    </div>
    <EmbedSource href={source} className={state !== 'unavailable' ? '[@media(scripting:enabled)]:hidden' : undefined}>{t('viewOnX')}</EmbedSource>
  </figure>;
}
