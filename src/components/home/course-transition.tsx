'use client';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { canonicalPath, type HomeView } from '@/lib/i18n/routing';
import { insertDisk, type DiskEntry, type DiskPhase } from './disk-motion';
import { zoomIntoScreen, zoomOutOfScreen } from './screen-zoom';

type HomeEntry = Omit<DiskEntry, 'home'> & { view: HomeView };
type Transition = {
  controller: AbortController;
  entry: Omit<DiskEntry, 'home'> & { home?: HTMLElement };
  onRouteCommit?: () => void;
  timeout?: ReturnType<typeof setTimeout>;
};
const Context = createContext<{
  phase: DiskPhase;
  openDisk: (entry: DiskEntry, openingLabel: string) => Promise<void>;
  returnHome: (entry: HomeEntry) => Promise<void>;
} | null>(null);
export function useCourseTransition() {
  const value = useContext(Context);
  if (!value) throw new Error('Course navigation requires CourseTransitionProvider');
  return value;
}

export function canAnimateNavigation(event: MouseEvent<HTMLAnchorElement>) {
  const click = event.nativeEvent;
  const pointerClick = 'pointerType' in click ? Boolean(click.pointerType) : click.detail > 0;
  return pointerClick && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    && !event.defaultPrevented && event.button === 0
    && typeof document.startViewTransition === 'function' && typeof event.currentTarget.animate === 'function'
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function CourseTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = canonicalPath(usePathname());
  const active = useRef<Transition | null>(null);
  const [phase, setPhase] = useState<DiskPhase>('idle');
  const [opening, setOpening] = useState('');
  const reset = useCallback((restoreFocus = false) => {
    const transition = active.current;
    if (!transition) return;
    active.current = null;
    transition.controller.abort();
    clearTimeout(transition.timeout);
    transition.onRouteCommit?.();
    delete transition.entry.source.dataset.inDrive;
    if (transition.entry.home) transition.entry.home.inert = false;
    if (restoreFocus && transition.entry.source.isConnected) transition.entry.source.focus();
    setPhase('idle');
  }, []);
  const navigate = useCallback((transition: Transition) => new Promise<void>(resolve => {
    if (active.current !== transition) { resolve(); return; }
    transition.onRouteCommit = resolve;
    // A stalled client navigation still has a working native destination.
    transition.timeout = setTimeout(() => window.location.assign(transition.entry.url), 8000);
    router.push(transition.entry.url);
  }), [router]);
  const openDisk = useCallback(async (entry: DiskEntry, openingLabel: string) => {
    if (active.current) return;
    const transition: Transition = { controller: new AbortController(), entry };
    active.current = transition;
    setOpening(openingLabel);
    router.prefetch(entry.url);
    try {
      const origin = await insertDisk(entry, transition.controller.signal, setPhase);
      if (active.current !== transition) return;
      if (origin) {
        setPhase('navigating');
        await zoomIntoScreen(origin, () => navigate(transition), transition.controller.signal);
      } else {
        await navigate(transition);
      }
    } catch {
      if (active.current === transition && !transition.onRouteCommit) await navigate(transition);
    } finally {
      if (active.current === transition) reset();
    }
  }, [navigate, reset, router]);
  const returnHome = useCallback(async (entry: HomeEntry) => {
    if (active.current) return;
    const transition: Transition = { controller: new AbortController(), entry };
    active.current = transition;
    router.prefetch(entry.url);
    try {
      await zoomOutOfScreen(entry.view, () => navigate(transition), transition.controller.signal);
    } catch {
      if (active.current === transition && !transition.onRouteCommit) await navigate(transition);
    } finally {
      if (active.current === transition) reset();
    }
  }, [navigate, reset, router]);

  useLayoutEffect(() => {
    const transition = active.current;
    if (!transition) return;
    const [destination] = transition.entry.url.split(/[?#]/, 1);
    if (pathname !== destination) { reset(); return; }
    clearTimeout(transition.timeout);
    transition.onRouteCommit?.();
  }, [pathname, reset]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && active.current && !active.current.onRouteCommit) { event.preventDefault(); reset(true); }
    };
    const settle = () => {
      const transition = active.current;
      if (!transition) return;
      if (transition.onRouteCommit) { transition.controller.abort(); return; }
      reset();
      router.push(transition.entry.url);
    };
    const cancel = () => reset();
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    window.addEventListener('keydown', escape);
    window.addEventListener('popstate', cancel);
    window.addEventListener('resize', settle);
    motion.addEventListener('change', settle);
    return () => {
      window.removeEventListener('keydown', escape);
      window.removeEventListener('popstate', cancel);
      window.removeEventListener('resize', settle);
      motion.removeEventListener('change', settle);
      reset();
    };
  }, [reset, router]);
  return <Context value={{ phase, openDisk, returnHome }}>{children}
    <span className="sr-only" role="status" aria-live="polite">{phase === 'idle' ? '' : opening}</span>
  </Context>;
}
