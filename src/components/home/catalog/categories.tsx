'use client';
import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import { diskMaterial, type GalleryItem } from '../disk';
import { createDiskCollection } from './disk-collection';

type Category = { id: string; title: string; cards: GalleryItem[] };
type CategoryJump = { id: string; top: number; smooth: boolean; reached: boolean };
const reducedMotion = '(prefers-reduced-motion: reduce)';

export const categoryHeadingId = (id: string) => `home-${id}-title`;

function headingOffset(scroller: Element, heading: HTMLElement) {
  return (parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0) + (parseFloat(getComputedStyle(heading).scrollMarginTop) || 0);
}

function categoryScrollTop(scroller: Element, heading: HTMLElement) {
  const top = scroller.scrollTop + heading.getBoundingClientRect().top - headingOffset(scroller, heading);
  return Math.max(0, Math.min(top, scroller.scrollHeight - scroller.clientHeight));
}

export function CourseCategories({ groups, label, catalog, collectionEnabled }: {
  groups: Category[]; label: string; catalog: RefObject<HTMLDivElement | null>; collectionEnabled: boolean;
}) {
  const nav = useRef<HTMLElement>(null);
  const jump = useRef<CategoryJump>(null);
  const [activeId, setActiveId] = useState(groups[0].id);

  useEffect(() => {
    const bar = nav.current;
    const deck = catalog.current;
    const scroller = document.scrollingElement;
    if (!bar || !deck || !scroller) return;
    const sections = groups.flatMap(({ id }) => {
      const heading = document.getElementById(categoryHeadingId(id));
      const section = heading?.parentElement;
      const tab = bar.querySelector<HTMLAnchorElement>(`[href="#${categoryHeadingId(id)}"]`);
      const fan = tab?.querySelector<HTMLElement>('.course-category-fan');
      return heading && section && tab && fan ? [{ id, heading, section, tab, fan }] : [];
    });
    if (!sections.length) return;

    const collection = createDiskCollection(deck, sections);
    const motion = window.matchMedia(reducedMotion);
    let previousTop = scroller.scrollTop;
    let frame = 0;

    const update = () => {
      frame = 0;
      const top = scroller.scrollTop;
      const direction = Math.sign(top - previousTop);
      const requested = jump.current;
      if (requested) {
        // The browser can still scroll a fraction of a pixel after reaching the target.
        if (Math.abs(top - requested.top) <= 1) requested.reached = true;
        else if (requested.reached && direction) jump.current = null;
      }
      previousTop = top;

      const height = scroller.clientHeight;
      const line = headingOffset(scroller, sections[0].heading) + 2;
      // The last heading can run out of room before it reaches the reading line.
      const atEnd = top > 0 && top + height >= scroller.scrollHeight - 1;
      const visible = atEnd ? sections.at(-1) : sections.findLast(({ heading }) => heading.getBoundingClientRect().top <= line);
      setActiveId(jump.current?.id ?? visible?.id ?? sections[0].id);

      if (collectionEnabled && !motion.matches) {
        collection.update(bar.getBoundingClientRect().bottom, height, jump.current?.smooth !== false ? direction : 0);
      }
    };

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    const resetGeometry = () => {
      previousTop = scroller.scrollTop;
      collection.clear();
      if (collectionEnabled && !motion.matches) collection.update(bar.getBoundingClientRect().bottom, scroller.clientHeight, 0);
      schedule();
    };

    const restoreCategory = () => {
      const target = sections.find(({ heading }) => window.location.hash === `#${heading.id}`);
      jump.current = target ? { id: target.id, top: categoryScrollTop(scroller, target.heading), smooth: false, reached: true } : null;
      schedule();
    };

    const finishScroll = () => {
      if (!jump.current || Math.abs(scroller.scrollTop - jump.current.top) <= 1) return;
      jump.current = null;
      schedule();
    };

    const masthead = bar.parentElement ?? bar;
    const observer = new ResizeObserver(() => {
      collection.retarget();
      schedule();
    });
    observer.observe(masthead);
    observer.observe(deck);
    sections.forEach(({ tab }) => observer.observe(tab, { box: 'border-box' }));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', resetGeometry);
    window.addEventListener('popstate', restoreCategory);
    window.addEventListener('hashchange', restoreCategory);
    document.addEventListener('scrollend', finishScroll);
    motion.addEventListener('change', resetGeometry);
    resetGeometry();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      collection.clear();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', resetGeometry);
      window.removeEventListener('popstate', restoreCategory);
      window.removeEventListener('hashchange', restoreCategory);
      document.removeEventListener('scrollend', finishScroll);
      motion.removeEventListener('change', resetGeometry);
    };
  }, [catalog, collectionEnabled, groups]);

  function navigate(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const { hash } = event.currentTarget;
    const heading = document.getElementById(hash.slice(1));
    const scroller = document.scrollingElement;
    if (!heading || !scroller) return;

    event.preventDefault();
    const top = categoryScrollTop(scroller, heading);
    const smooth = event.detail > 0 && !window.matchMedia(reducedMotion).matches;
    jump.current = { id, top, smooth, reached: Math.abs(scroller.scrollTop - top) <= 1 };
    setActiveId(id);
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    heading.focus({ preventScroll: true });
    window.scrollTo({ top, behavior: smooth ? 'smooth' : 'instant' });
  }

  return <nav ref={nav} className="course-category-tabs" aria-label={label}>
    {groups.map(({ id, title, cards }) => <a key={id} href={`#${categoryHeadingId(id)}`} className="course-category-tab"
      aria-current={activeId === id ? 'location' : undefined} onClick={event => navigate(event, id)}>
      <span>{title}</span>
      <span className="course-category-fan" aria-hidden>
        {[0, 1, 2].map(index => <span key={index} className="course-category-mini-disk"
          style={diskMaterial(cards[Math.min(index, cards.length - 1)])} />)}
      </span>
    </a>)}
  </nav>;
}
