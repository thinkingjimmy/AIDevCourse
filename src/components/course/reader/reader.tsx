'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Button } from '@/components/ui/button';
import { readingPaths, readingPrefix, type ReadingPane, type ReadingTarget } from './model';
import { animateSource, canAnimateReading, captureSourceMotion, readingMotion, type SourceMotion } from './motion';
import styles from './reader.module.css';

type Change = { reveal?: string; trigger?: HTMLElement };
type ReadingPosition = { scroller: HTMLElement; anchor?: HTMLElement; offset: number; top: number; count: number };

function captureSourcePosition(stage: HTMLElement | null, count: number, preferred?: HTMLElement): ReadingPosition | null {
  const scroller = stage?.querySelector<HTMLElement>('[data-slot="reading-primary"] [data-slot="lesson-region"]');
  if (!scroller) return null;
  const bounds = scroller.getBoundingClientRect();
  const box = preferred?.getBoundingClientRect();
  const anchor = scroller.scrollTop > 0 && preferred && scroller.contains(preferred) && box && box.bottom > bounds.top && box.top < bounds.bottom ? preferred
    : [...scroller.querySelectorAll<HTMLElement>('article > h1, article > p, .course-prose > *')]
    .find(element => { const box = element.getBoundingClientRect(); return box.height > 0 && box.bottom > bounds.top + 16; });
  return { scroller, anchor, offset: (anchor?.getBoundingClientRect().top ?? bounds.top) - bounds.top, top: scroller.scrollTop, count };
}

export function LessonReader({ source, targets, panes, children }: {
  source: string; targets: ReadingTarget[]; panes: ReadingPane[]; children: ReactNode;
}) {
  const t = useTranslations('Ui');
  const router = useRouter();
  const stage = useRef<HTMLDivElement>(null);
  const sourcePosition = useRef<ReadingPosition | null>(null);
  const sourceAnchor = useRef<HTMLElement | undefined>(undefined);
  const sourceOrigin = useRef<{ top: number; width: number } | null>(null);
  const sourceLock = useRef<{ position: ReadingPosition; origin: { top: number; width: number } | null } | null>(null);
  const sourceMotion = useRef<SourceMotion | null>(null);
  const sourceAnimation = useRef<Pick<Animation, 'cancel'> | null>(null);
  const closeAction = useRef<(() => void) | null>(null);
  const keyboardInput = useRef(false);
  const referencePositions = useRef(new Map<string, number>());
  const triggers = useRef(new Map<string, HTMLAnchorElement>());
  const desired = useRef(panes.map(pane => pane.url));
  const change = useRef<Change | null>(null);
  const previous = useRef('');
  const [pendingTarget, setPendingTarget] = useState<ReadingTarget | null>(null);
  const [closingTarget, setClosingTarget] = useState<ReadingTarget | null>(null);
  const [closing, setClosing] = useState(false);
  const [motion, setMotion] = useState<'none' | 'open' | 'replace' | 'close'>('none');
  const [pending, startTransition] = useTransition();
  const pendingPane = pending && pendingTarget && panes.length === 0 ? pendingTarget : null;
  const replacing = pending && pendingTarget && panes.length > 0 && panes[0].url.split('#')[0] !== pendingTarget.url.split('#')[0];
  const pane = panes[0];
  const visibleTarget = pane ?? pendingPane ?? closingTarget;
  const count = !closing && visibleTarget ? 1 : 0;
  const open = count > 0;

  function reveal(path: string, focus: boolean) {
    const root = stage.current;
    const pane = [...root?.querySelectorAll<HTMLElement>('[data-reading-url]') ?? []].find(element => element.dataset.readingUrl === path.split('#')[0]);
    if (!root || !pane) return;
    if (pane.offsetLeft < root.scrollLeft) root.scrollLeft = pane.offsetLeft;
    else if (pane.offsetLeft + pane.offsetWidth > root.scrollLeft + root.clientWidth) root.scrollLeft = pane.offsetLeft + pane.offsetWidth - root.clientWidth;
    const fragment = path.split('#').slice(1).join('#');
    let target: HTMLElement | null = null;
    if (fragment) {
      try { target = pane.querySelector<HTMLElement>(`#${CSS.escape((path.split('#')[0] === source ? '' : readingPrefix(path.split('#')[0])) + decodeURIComponent(fragment))}`); }
      catch { /* A malformed fragment still opens the requested article. */ }
      target?.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
    }
    if (focus) (target ?? pane.querySelector<HTMLElement>('article > h1, article > h2, .course-overview') ?? pane.querySelector<HTMLElement>('[data-slot="reading-scroll"]'))?.focus({ preventScroll: true });
  }

  function navigate(paths: string[], update: Change, replace = false) {
    rememberReference();
    if (paths.length !== (stage.current?.hasAttribute('data-open') ? 1 : 0)) {
      rememberSource(paths.length, update.trigger ?? triggers.current.get(update.reveal?.split('#')[0] ?? ''));
    }
    desired.current = paths;
    change.current = update;
    const url = new URL(window.location.href);
    url.searchParams.delete('read');
    paths.forEach(path => url.searchParams.append('read', path));
    startTransition(() => router[replace ? 'replace' : 'push'](`${source}${url.search}${url.hash}`, { scroll: false }));
  }

  function rememberReference() {
    const pane = stage.current?.querySelector<HTMLElement>('[data-slot="reading-pane"]');
    const scroller = pane?.querySelector<HTMLElement>('[data-slot="reading-scroll"]');
    if (pane?.dataset.readingUrl && scroller) referencePositions.current.set(pane.dataset.readingUrl, scroller.scrollTop);
  }

  const rememberSource = useCallback((targetCount: number, preferred?: HTMLElement) => {
    const source = stage.current?.querySelector('[data-slot="reading-primary"]');
    const anchor = preferred && source?.contains(preferred) ? preferred : sourceAnchor.current;
    sourcePosition.current = captureSourcePosition(stage.current, targetCount, anchor);
    sourceAnchor.current = sourcePosition.current?.anchor;
    if (count === 0 && targetCount > 0 && sourcePosition.current) {
      sourceOrigin.current = { top: sourcePosition.current.top, width: sourcePosition.current.scroller.getBoundingClientRect().width };
    }
  }, [count]);

  function restoreSource() {
    const lock = sourceLock.current;
    if (!lock?.position.scroller.isConnected) return;
    const { position, origin } = lock;
    const top = origin && Math.abs(position.scroller.getBoundingClientRect().width - origin.width) < 1 ? origin.top : position.anchor?.isConnected
      ? position.scroller.scrollTop + position.anchor.getBoundingClientRect().top - position.scroller.getBoundingClientRect().top - position.offset
      : position.top;
    if (Math.abs(position.scroller.scrollTop - top) > 0.5) position.scroller.scrollTop = top;
  }

  function close(animate: boolean) {
    if (closing) { if (!animate) finishClose(); return; }
    const path = panes[0]?.url ?? pendingTarget?.url;
    const opener = triggers.current.get(path?.split('#')[0] ?? '');
    const trigger = opener?.isConnected ? opener : [...triggers.current.values()].reverse().find(element => element.isConnected && element.closest('[data-slot="reading-primary"]'));
    const animated = canAnimateReading(animate && !keyboardInput.current);
    prepareSourceMotion(0, animated, readingMotion.exit);
    rememberSource(0, trigger);
    rememberReference();
    setClosingTarget(visibleTarget ?? null);
    setClosing(true);
    setMotion(animated ? 'close' : 'none');
    setPendingTarget(null);
    if (stage.current) stage.current.scrollLeft = 0;
    closeAction.current = () => {
      setClosingTarget(null);
      navigate([], { trigger, reveal: source }, true);
      restoreTrigger(trigger);
    };
    if (!animated) finishClose();
  }

  function finishClose() {
    const action = closeAction.current;
    closeAction.current = null;
    action?.();
  }

  function prepareSourceMotion(targetCount: number, animated: boolean, duration: number) {
    sourceMotion.current = animated ? captureSourceMotion(stage.current, targetCount, duration) : null;
    sourceAnimation.current?.cancel();
    sourceAnimation.current = null;
  }

  function restoreTrigger(trigger?: HTMLElement) {
    if (!trigger?.isConnected) return;
    trigger.focus({ preventScroll: true });
    const owner = trigger.closest<HTMLElement>('[data-reading-url]')?.dataset.readingUrl;
    if (owner) reveal(owner, false);
  }

  function releaseSourcePosition(target: EventTarget) {
    if (!(target instanceof Element) || !target.closest('[data-slot="reading-primary"]')) return;
    sourceOrigin.current = null;
    sourcePosition.current = null;
    sourceLock.current = null;
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!anchor || anchor.hasAttribute('download') || anchor.target && anchor.target !== '_self' || anchor.hasAttribute('data-reading-standalone')) return;
    if (!anchor.closest('.course-prose, [data-slot="reading-pane"], [data-slot="note-body"]')) return;
    const owner = anchor.closest<HTMLElement>('[data-reading-url]')?.dataset.readingUrl ?? source;
    const url = new URL(anchor.getAttribute('href')!, new URL(owner, window.location.origin));
    if (url.origin !== window.location.origin || url.search) return;
    const target = targets.find(target => target.url === url.pathname);
    if (!target) return;
    if (url.pathname === owner && owner === source) return;
    const href = `${url.pathname}${url.hash}`;
    const existing = url.pathname === source || desired.current.some(path => path.split('#')[0] === url.pathname);
    event.preventDefault();
    if (existing && !closing) { reveal(href, true); return; }
    const animated = canAnimateReading(event.detail !== 0 && !keyboardInput.current);
    closeAction.current = null;
    if (!open) prepareSourceMotion(1, animated, readingMotion.enter);
    setClosing(false);
    setClosingTarget(null);
    setMotion(animated ? open ? 'replace' : 'open' : 'none');
    triggers.current.set(url.pathname, anchor);
    setPendingTarget({ ...target, url: href });
    navigate([href], { reveal: href });
  }

  useLayoutEffect(() => {
    const position = sourcePosition.current;
    if (position && count === position.count) {
      if (!pending) sourcePosition.current = null;
      const origin = count === 0 ? sourceOrigin.current : null;
      if (!pending && count === 0) sourceOrigin.current = null;
      sourceLock.current = { position, origin };
      restoreSource();
    }
    if (!pending) desired.current = panes.map(pane => pane.url);
    const key = panes.map(pane => pane.url).join('|');
    if (previous.current === key) {
      if (pendingPane) reveal(pendingPane.url, false);
      else if (!pending && change.current) {
        if (change.current.reveal) reveal(change.current.reveal, !change.current.trigger);
        restoreTrigger(change.current.trigger);
        change.current = null;
      }
      return;
    }
    previous.current = key;
    const update = change.current;
    change.current = null;
    const path = update?.reveal ?? panes.at(-1)?.url ?? source;
    const savedScroll = path.includes('#') ? undefined : referencePositions.current.get(path);
    reveal(path, !update?.trigger && savedScroll === undefined);
    if (savedScroll !== undefined) {
      const scroller = stage.current?.querySelector<HTMLElement>('[data-slot="reading-scroll"]');
      if (scroller) { scroller.scrollTop = savedScroll; scroller.focus({ preventScroll: true }); }
    }
    restoreTrigger(update?.trigger);
  });

  useLayoutEffect(() => {
    const scroller = stage.current?.querySelector<HTMLElement>('[data-slot="reading-primary"] [data-slot="lesson-region"]');
    const group = scroller?.querySelector<HTMLElement>('[data-slot="lesson-reading-group"]');
    if (!scroller || !group) return;
    // Note-rail layout can resize after the route commits; keep the reading anchor until user input.
    const observer = new ResizeObserver(() => {
      restoreSource();
      const motion = sourceMotion.current;
      if (motion?.count !== count) return;
      sourceMotion.current = null;
      sourceAnimation.current = animateSource(motion);
    });
    observer.observe(scroller);
    observer.observe(group);
    return () => observer.disconnect();
  });

  useEffect(() => {
    function onPop() {
      closeAction.current = null;
      setClosing(false);
      setClosingTarget(null);
      setPendingTarget(null);
      setMotion('none');
      prepareSourceMotion(0, false, 0);
      rememberReference();
      const paths = readingPaths(new URL(window.location.href).searchParams.getAll('read'), source, targets);
      if (paths.length === count) return;
      const reference = panes[0]?.url ?? paths[0];
      rememberSource(paths.length, triggers.current.get(reference?.split('#')[0] ?? ''));
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [count, panes, rememberSource, source, targets]);

  useEffect(() => {
    if (!closing || !closeAction.current) return;
    const action = closeAction.current;
    const timeout = window.setTimeout(() => { if (closeAction.current === action) finishClose(); }, readingMotion.exit + 50);
    return () => window.clearTimeout(timeout);
  }, [closing, motion]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    function onPreference() {
      if (!preference.matches) return;
      sourceMotion.current = null;
      sourceAnimation.current?.cancel();
      setMotion('none');
      finishClose();
    }
    preference.addEventListener('change', onPreference);
    return () => {
      preference.removeEventListener('change', onPreference);
      sourceAnimation.current?.cancel();
      closeAction.current = null;
    };
  }, []);

  useEffect(() => {
    if (!visibleTarget) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || document.querySelector('[role="dialog"], [data-slot="jimmy-note-popover"], [data-slot="link-preview"], [data-slot="selection-feedback"]')) return;
      event.preventDefault();
      close(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return <div ref={stage} data-slot="lesson-reader" data-open={open || undefined} data-closing={closing || undefined}
    style={{ '--reading-enter': `${readingMotion.enter}ms`, '--reading-exit': `${readingMotion.exit}ms`, '--reading-content': `${readingMotion.content}ms`, '--reading-easing': readingMotion.easing } as CSSProperties}
    className={`relative flex min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain [overflow-anchor:none] ${styles.stage}`} onClickCapture={onClick}
    onPointerDownCapture={event => { keyboardInput.current = false; releaseSourcePosition(event.target); }}
    onWheelCapture={event => releaseSourcePosition(event.target)}
    onTouchMoveCapture={event => releaseSourcePosition(event.target)}
    onKeyDownCapture={event => {
      keyboardInput.current = true;
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) releaseSourcePosition(event.target);
    }}>
    <div data-slot="reading-primary" data-reading-url={source} className={`@container/reader relative flex min-h-0 min-w-0 basis-full shrink-0 flex-col overflow-clip ${styles.primary}`}>{children}</div>
    {visibleTarget && <section key={visibleTarget.url.split('#')[0]} data-slot={pane ? 'reading-pane' : 'reading-pending'} data-reading-url={visibleTarget.url.split('#')[0]}
      data-motion={motion} data-closing={closing || undefined} inert={closing} aria-hidden={closing || undefined}
      aria-label={t('sideReading', { title: visibleTarget.title })} aria-busy={!pane || replacing || undefined} className={styles.pane}
      onTransitionEnd={event => { if (event.target === event.currentTarget && event.propertyName === 'opacity' && closing) finishClose(); }}>
      <ReadingClose onClose={close} />
      <div data-slot="reading-scroll" data-lesson-scroll="" tabIndex={0} className={`@container/lesson ${styles.scroll}`}>
        <div key={pane?.url ?? 'pending'} data-slot="reading-content" className={styles.content}>
          {pane ? pane.content : <div role="status" className="py-8 pr-12 text-sm text-muted-foreground">{t('readingLoading')}</div>}
        </div>
      </div>
      {replacing && <span role="status" className="absolute top-3 left-4 rounded-sm bg-background px-3 py-2 text-sm text-muted-foreground">{t('readingLoading')}</span>}
    </section>}
    {pending && !pendingPane && <span role="status" className="sr-only">{t('readingLoading')}</span>}
  </div>;
}

function ReadingClose({ onClose }: { onClose: (animate: boolean) => void }) {
  const t = useTranslations('Ui');
  return <Button variant="ghost" size="icon-touch" className={styles.close} aria-label={t('closeReading')} title={t('closeReading')}
    onClick={event => onClose(event.detail !== 0)}><XIcon size={18} aria-hidden /></Button>;
}

export function ReadingFailure() {
  const t = useTranslations('Ui');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <div role="alert" className="py-8">
    <p className="text-sm leading-body text-muted-foreground">{t('readingFailed')}</p>
    <Button variant="brand-outline" className="min-h-11" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{t('retryReading')}</Button>
  </div>;
}
