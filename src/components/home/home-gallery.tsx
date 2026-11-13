'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { BlogArticleLink, DiskLink, opticalDiscArtwork, type BlogArticle, type GalleryItem } from './disk';
import { AuthorDialog } from '@/components/author/author-card';
import { HeroPrimaryAction } from '@/components/layout/page-primitives';
import { useHomeHeader } from '@/components/layout/site-frame';
import type { Locale } from '@/lib/i18n/config';
import { homePath, type HomeView } from '@/lib/i18n/routing';
import { canAnimateNavigation, useCourseTransition } from './course-transition';
import { HomeDeviceStage, orbitDevices, type HomeOrbit, type SwitchDirection } from './device-stage';

export type GalleryLabels = {
  title: string; start: string; opening: Record<HomeView, string>;
  previous: string; next: string; pagination: string; views: Record<HomeView, string>; switchView: string;
  macGroups: { beginner: string; intermediate: string; dictionaries: string };
  blogOverview: string; emptyResources: string;
  switchTo: Record<HomeView, { previous: string; next: string }>;
};
type GallerySwitch = { from: HomeView; to: HomeView; direction: SwitchDirection; fromPage: number };
type MediaLinkEvents = Pick<ComponentProps<'a'>, 'onClick' | 'onPointerEnter' | 'onPointerLeave' | 'onFocus' | 'onBlur'>;
const pageSize = 9;
const beginnerOrder = new Map(['ai-coding', 'llm-101', 'deepseek-101', 'design-101'].map((id, index) => [id, index]));
const isBeginner = (item: GalleryItem) => item.group === 'beginner' || item.group === 'introduction';
const beginnerRank = (id: string) => beginnerOrder.get(id) ?? beginnerOrder.size;

export function HomeGallery({ items, blog, locale, initialView, initialPage, labels, startUrl, children }: {
  items: { courses: GalleryItem[]; dictionaries: GalleryItem[] };
  blog?: { title: string; url: string; articles: BlogArticle[] };
  locale: Locale; initialView: HomeView; initialPage: number;
  labels: GalleryLabels; startUrl: string; children?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const masthead = useRef<HTMLElement>(null);
  const orbit = useRef<HomeOrbit>(undefined);
  const header = useHomeHeader();
  const search = useSearchParams();
  const [selected, setSelected] = useState<{ view: HomeView; title: string; opening: string }>();
  const [switching, setSwitching] = useState<GallerySwitch>();
  const { phase, openDisk } = useCourseTransition();
  const routeView = search ? search.get('view') === 'resources' ? 'resources' : 'courses' : initialView;
  const view = switching?.to ?? routeView;
  const nextView = view === 'courses' ? 'resources' : 'courses';
  const coursesActive = view === 'courses';
  const compactBlog = blog && blog.articles.length > 0 && blog.articles.length <= 2;
  const pageValues = search?.getAll('page');
  const requestedPage = pageValues ? pageValues.length === 1 ? Number(pageValues[0]) : 1 : initialPage;
  const page = Number.isSafeInteger(requestedPage) ? Math.max(1, requestedPage) : 1;
  const orderedMacItems = [
    ...items.courses.filter(isBeginner).sort((a, b) => beginnerRank(a.id) - beginnerRank(b.id)),
    ...items.courses.filter(item => !isBeginner(item)),
    ...items.dictionaries,
  ];
  const pages = Math.max(1, Math.ceil(orderedMacItems.length / pageSize));
  const coursePage = Math.min(pages, switching?.from === 'courses' ? switching.fromPage : switching ? 1 : page);
  const visibleMacItems = orderedMacItems.slice((coursePage - 1) * pageSize, coursePage * pageSize);
  const courseGroups = [
    { id: 'beginner', title: labels.macGroups.beginner, cards: visibleMacItems.filter(isBeginner) },
    { id: 'intermediate', title: labels.macGroups.intermediate, cards: visibleMacItems.filter(item => item.kind === 'course' && !isBeginner(item)) },
    { id: 'dictionaries', title: labels.macGroups.dictionaries, cards: visibleMacItems.filter(item => item.kind === 'dictionary') },
  ];

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
    orbit.current?.animations.forEach(animation => animation.finish());
    setSwitching(undefined);
  }, []);
  useLayoutEffect(() => {
    if (!switching) {
      // Keep the final frames in place until React hides the outgoing deck.
      orbit.current?.animations.forEach(animation => animation.cancel());
      orbit.current = undefined;
      return;
    }
    if (!root.current) return;
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

  const pageUrl = (destination: HomeView, number = 1) => homePath(locale, destination, number);
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
  const mediaLinkEvents = ({ title, url }: Pick<GalleryItem, 'title' | 'url'>, section: HomeView, opening: string): MediaLinkEvents => {
    const selection = { view: section, title, opening };
    return {
      onClick: event => {
        const home = root.current;
        if (!home || !canAnimateNavigation(event)) return;
        event.preventDefault();
        finishSwitch();
        setSelected(selection);
        void openDisk({ home, source: event.currentTarget, url }, opening);
      },
      onPointerEnter: event => { if (event.pointerType === 'mouse' && phase === 'idle') setSelected(selection); },
      onPointerLeave: () => { if (phase === 'idle') setSelected(undefined); },
      onFocus: event => {
        if (phase !== 'idle') return;
        setSelected(selection);
        if (event.currentTarget.matches(':focus-visible')) {
          const obscured = event.currentTarget.getBoundingClientRect().top < (masthead.current?.getBoundingClientRect().bottom ?? 0) + 12;
          event.currentTarget.scrollIntoView({ block: obscured ? 'start' : 'nearest', behavior: 'instant' });
        }
      },
      onBlur: () => { if (phase === 'idle') setSelected(undefined); },
    };
  };

  return <div ref={root} className="home-gallery" data-disk-phase={phase} data-home-view={view} data-home-switching={switching ? '' : undefined}>
    {Boolean(blog?.articles.length) && <link rel="preload" as="image" href={opticalDiscArtwork} type="image/avif" fetchPriority="low" />}
    <header ref={masthead} data-slot="home-hero" className="gallery-hero">
      <div className="gallery-copy">
        <div className="gallery-heading">
          {header}
          <h1>{labels.title}</h1>
        </div>
        <div className="gallery-actions">
          <HeroPrimaryAction href={startUrl} className="max-[721px]:w-auto">{labels.start}</HeroPrimaryAction>
          <AuthorDialog variant="text" />
        </div>
      </div>
      <HomeDeviceStage view={view} title={selected?.view === view ? selected.title : undefined}
        status={phase === 'idle' ? undefined : selected?.opening}
        href={pageUrl(nextView)} labels={{ group: labels.switchView, rear: labels.views[nextView], ...labels.switchTo[nextView] }}
        onSwitch={handleSwitch} onKeyDown={handleDirectionKey} />
    </header>
    <span className="sr-only" role="status">{labels.views[view]}</span>
    <main id="main-content" tabIndex={-1} className="home-courses">
      <div id="catalog" className="disk-catalog">
        <div className="disk-group" data-gallery-view="courses"
          hidden={!coursesActive && switching?.from !== 'courses'} inert={!coursesActive}>
          {children}
          {courseGroups.filter(group => group.cards.length).map(({ id, title, cards }) =>
            <section key={id} aria-labelledby={`home-${id}-title`}>
              <h2 id={`home-${id}-title`} className="disk-group-title">{title}</h2>
              <div data-slot={id === 'dictionaries' ? 'dictionary-grid' : 'course-grid'} className="disk-grid">
                {cards.map(item => <DiskLink key={item.id} item={item} showDictionaryCount
                  {...mediaLinkEvents(item, 'courses', labels.opening[item.kind === 'course' ? 'courses' : 'resources'])} />)}
              </div>
            </section>,
          )}
          {pages > 1 && <nav className="disk-pagination" aria-label={labels.pagination}>
            {coursePage > 1 ? <Link href={pageUrl('courses', coursePage - 1)} aria-label={labels.previous} scroll={false}><ArrowLeftIcon size={16} aria-hidden /></Link> : <span aria-hidden><ArrowLeftIcon size={16} /></span>}
            <span aria-live="polite">{String(coursePage).padStart(2, '0')} / {String(pages).padStart(2, '0')}</span>
            {coursePage < pages ? <Link href={pageUrl('courses', coursePage + 1)} aria-label={labels.next} scroll={false}><ArrowRightIcon size={16} aria-hidden /></Link> : <span aria-hidden><ArrowRightIcon size={16} /></span>}
          </nav>}
        </div>
        <div className="disk-group" data-gallery-view="resources"
          hidden={coursesActive && switching?.from !== 'resources'} inert={coursesActive}>
          <section className="home-blog" aria-labelledby="home-blog-title" data-compact={compactBlog ? '' : undefined}>
            <header className="blog-section-header">
              <h2 id="home-blog-title" className="disk-group-title">{blog?.title ?? labels.views.resources}</h2>
              {compactBlog && <Link className="blog-overview-link" href={blog.url}>
                {labels.blogOverview}<ArrowRightIcon size={14} aria-hidden />
              </Link>}
            </header>
            {blog && blog.articles.length > 0 ? <>
              <ol className="blog-grid" data-slot="blog-grid" role="list">
                {blog.articles.map(article => <li key={article.id}>
                  <BlogArticleLink article={article} {...mediaLinkEvents(article, 'resources', labels.opening.resources)} />
                </li>)}
              </ol>
              {!compactBlog && <div className="blog-more-row">
                <Link className="blog-more-link" href={blog.url} aria-label={`More · ${blog.title}`}>
                  <span lang="en">More</span><ArrowRightIcon size={16} aria-hidden />
                </Link>
              </div>}
            </> : <p className="text-sm text-muted-foreground">{labels.emptyResources}</p>}
          </section>
        </div>
      </div>
    </main>
  </div>;
}
