'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { DiskLink, type GalleryItem } from './disk';
import { AuthorDialog } from '@/components/author/author-card';
import { HeroPrimaryAction } from '@/components/layout/page-primitives';
import { useHomeHeader } from '@/components/layout/site-frame';
import type { Locale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { canAnimateNavigation, useCourseTransition } from './course-transition';
import { HomeDeviceStage, orbitDevices, type HomeOrbit, type HomeView, type SwitchDirection } from './device-stage';

export type GalleryLabels = {
  title: string; intro: string; start: string; opening: Record<HomeView, string>;
  previous: string; next: string; pagination: string; views: Record<HomeView, string>; switchView: string;
  switchTo: Record<HomeView, { previous: string; next: string }>;
};
type GallerySwitch = { from: HomeView; to: HomeView; direction: SwitchDirection; fromPage: number };
const views = ['courses', 'resources'] as const;
const pageSize = 9;

export function HomeGallery({ items, locale, initialView, initialPage, labels, startUrl, children }: {
  items: Record<HomeView, GalleryItem[]>; locale: Locale; initialView: HomeView; initialPage: number;
  labels: GalleryLabels; startUrl: string; children?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const masthead = useRef<HTMLElement>(null);
  const orbit = useRef<HomeOrbit>(undefined);
  const header = useHomeHeader();
  const search = useSearchParams();
  const [selected, setSelected] = useState<{ view: HomeView; title: string }>();
  const [switching, setSwitching] = useState<GallerySwitch>();
  const { phase, openCourse } = useCourseTransition();
  const routeView = search ? search.get('view') === 'resources' ? 'resources' : 'courses' : initialView;
  const view = switching?.to ?? routeView;
  const nextView = view === 'courses' ? 'resources' : 'courses';
  const pageValues = search?.getAll('page');
  const requestedPage = pageValues ? pageValues.length === 1 ? Number(pageValues[0]) : 1 : initialPage;
  const page = Number.isSafeInteger(requestedPage) ? Math.max(1, requestedPage) : 1;

  useLayoutEffect(() => {
    const element = masthead.current;
    if (!element) return;
    const updateHeight = () => document.documentElement.style.setProperty('--home-masthead-height', `${Math.ceil(element.getBoundingClientRect().height)}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--home-masthead-height');
    };
  }, []);

  const finishSwitch = useCallback(() => {
    orbit.current?.animations.forEach(animation => animation.cancel());
    orbit.current = undefined;
    setSwitching(undefined);
  }, []);
  useLayoutEffect(() => {
    if (!switching || !root.current) return;
    const active = orbitDevices(root.current, switching.from, switching.to, switching.direction, orbit.current);
    orbit.current = active;
    void active.animations[0].finished.then(() => {
      if (orbit.current === active) finishSwitch();
    }, () => {});
  }, [switching, finishSwitch]);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduce = () => { if (motion.matches) finishSwitch(); };
    motion.addEventListener('change', reduce);
    return () => {
      motion.removeEventListener('change', reduce);
      orbit.current?.animations.forEach(animation => animation.cancel());
    };
  }, [finishSwitch]);

  const pageUrl = (destination: HomeView, number = 1) => {
    const params = new URLSearchParams();
    if (destination === 'resources') params.set('view', 'resources');
    if (number > 1) params.set('page', String(number));
    const query = params.toString();
    return `${localePath(locale)}${query ? `?${query}` : ''}`;
  };
  const switchView = (direction: SwitchDirection, animate: boolean) => {
    if (phase !== 'idle' || root.current?.inert) return;
    const animated = animate && typeof root.current?.animate === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setSelected(undefined);
    if (animated) setSwitching({ from: view, to: nextView, direction, fromPage: switching ? 1 : page });
    else finishSwitch();
    window.history.replaceState(null, '', pageUrl(nextView));
  };
  const handleSwitch = (event: MouseEvent<HTMLAnchorElement>, direction: SwitchDirection) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    switchView(direction, event.detail > 0);
  };
  const handleDirectionKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    if (event.repeat) return;
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    event.currentTarget.querySelector<HTMLElement>(`[data-direction="${direction < 0 ? 'previous' : 'next'}"]`)?.focus();
    switchView(direction, false);
  };
  const navigate = (event: MouseEvent<HTMLAnchorElement>, item: GalleryItem, section: HomeView) => {
    const home = root.current;
    if (!home || !canAnimateNavigation(event)) return;
    event.preventDefault();
    finishSwitch();
    setSelected({ view: section, title: item.title });
    void openCourse({ home, source: event.currentTarget, url: item.url });
  };
  return <div ref={root} className="home-gallery" data-disk-phase={phase} data-home-view={view} data-home-switching={switching ? '' : undefined}>
    <header ref={masthead} data-slot="home-hero" className="gallery-hero">
      <div className="gallery-copy">
        <div className="gallery-heading">
          {header}
          <h1>{labels.title}</h1>
        </div>
        <p>{labels.intro}</p>
        <div className="gallery-actions">
          <HeroPrimaryAction href={startUrl} className="max-[721px]:w-auto">{labels.start}</HeroPrimaryAction>
          <AuthorDialog variant="text" />
        </div>
      </div>
      <HomeDeviceStage view={view} title={selected?.view === view ? selected.title : undefined} status={phase === 'idle' ? undefined : labels.opening[view]}
        href={pageUrl(nextView)} labels={{ group: labels.switchView, ...labels.switchTo[nextView] }} onSwitch={handleSwitch} onKeyDown={handleDirectionKey} />
    </header>
    <span className="sr-only" role="status">{labels.views[view]}</span>
    <main id="main-content" tabIndex={-1} className="home-courses">
      <div id="catalog" className="disk-catalog">
        {views.map(section => {
          const pages = Math.max(1, Math.ceil(items[section].length / pageSize));
          const panelPage = Math.min(pages, switching ? section === switching.from ? switching.fromPage : 1 : page);
          const visible = items[section].slice((panelPage - 1) * pageSize, panelPage * pageSize);
          const active = section === view;
          const optical = section === 'resources';
          return <section className="disk-group" key={section} data-gallery-view={section} aria-labelledby={`home-${section}-title`}
            hidden={!active && section !== switching?.from} inert={!active}>
            <h2 id={`home-${section}-title`} className="disk-group-title">{labels.views[section]}</h2>
            {visible.length ? <div data-slot={optical ? 'resource-grid' : 'course-grid'} className="disk-grid">
              {visible.map(item => <DiskLink key={item.id} item={item} optical={optical}
                onClick={event => navigate(event, item, section)}
                onPointerEnter={event => { if (event.pointerType === 'mouse' && phase === 'idle') setSelected({ view: section, title: item.title }); }}
                onPointerLeave={() => { if (phase === 'idle') setSelected(undefined); }}
                onFocus={event => {
                  if (phase !== 'idle') return;
                  setSelected({ view: section, title: item.title });
                  if (event.currentTarget.matches(':focus-visible')) {
                    const obscured = event.currentTarget.getBoundingClientRect().top < (masthead.current?.getBoundingClientRect().bottom ?? 0) + 12;
                    event.currentTarget.scrollIntoView({ block: obscured ? 'start' : 'nearest', behavior: 'instant' });
                  }
                }}
                onBlur={() => { if (phase === 'idle') setSelected(undefined); }} />)}
            </div> : children}
            {pages > 1 && <nav className="disk-pagination" aria-label={labels.pagination}>
              {panelPage > 1 ? <Link href={pageUrl(section, panelPage - 1)} aria-label={labels.previous} scroll={false}><ArrowLeftIcon size={16} aria-hidden /></Link> : <span aria-hidden><ArrowLeftIcon size={16} /></span>}
              <span aria-live="polite">{String(panelPage).padStart(2, '0')} / {String(pages).padStart(2, '0')}</span>
              {panelPage < pages ? <Link href={pageUrl(section, panelPage + 1)} aria-label={labels.next} scroll={false}><ArrowRightIcon size={16} aria-hidden /></Link> : <span aria-hidden><ArrowRightIcon size={16} /></span>}
            </nav>}
          </section>;
        })}
      </div>
    </main>
  </div>;
}
