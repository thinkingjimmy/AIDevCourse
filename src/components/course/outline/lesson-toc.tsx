'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Tooltip } from 'radix-ui';
import { cn } from '@/lib/utils';
import { useActiveHeading } from './use-active-heading';

const markerWidths = [52, 40, 28, 20, 12];

export function LessonToc({ items, label, hasNotes = false }: {
  items: { title: ReactNode; url: string }[]; label: string; hasNotes?: boolean;
}) {
  const nav = useRef<HTMLElement>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const urls = useMemo(() => items.map(item => item.url), [items]);
  const { activeUrl, setActiveUrl } = useActiveHeading(urls);

  useEffect(() => {
    function revealCurrent(preferred?: Element | null) {
      if (!nav.current?.getClientRects().length) {
        setPreviewIndex(null);
        return;
      }
      if (getComputedStyle(nav.current).getPropertyValue('--toc-expanded').trim() === '1') setPreviewIndex(null);
      const link = preferred ?? nav.current.querySelector('[aria-current="location"]');
      const scroller = nav.current;
      if (!link?.getClientRects().length || !scroller || scroller.scrollHeight <= scroller.clientHeight) return;
      const item = link.getBoundingClientRect();
      const rail = scroller.getBoundingClientRect();
      if (item.top < rail.top) scroller.scrollTop += item.top - rail.top - 12;
      else if (item.bottom > rail.bottom) scroller.scrollTop += item.bottom - rail.bottom + 12;
    }
    const frame = window.requestAnimationFrame(() => revealCurrent());
    const observer = new ResizeObserver(() => revealCurrent(nav.current?.querySelector(':focus-visible')));
    if (nav.current) observer.observe(nav.current);
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, [activeUrl]);

  return <aside data-slot="lesson-aside" className={cn(
    '@container/toc fixed top-[50svh] left-[calc(var(--lesson-sidebar-width)+0.5rem)] z-20 hidden w-16 -translate-y-1/2 min-[961px]:block',
    // Both layouts leave 1rem between the expanded outline and the centered article.
    hasNotes ? '@[86.5rem]/lesson:w-56' : '@[63.5rem]/lesson:w-56',
  )}>
    <Tooltip.Provider delayDuration={0} skipDelayDuration={0} disableHoverableContent>
      <nav ref={nav} data-slot="lesson-toc" aria-label={label}
        className="max-h-[calc(100svh-4rem)] overflow-x-hidden overflow-y-auto overscroll-contain py-1 pl-1 [--toc-expanded:0] [scrollbar-width:thin] @[10rem]/toc:[--toc-expanded:1] [&::-webkit-scrollbar]:w-2">
        {items.map((item, index) => {
          const distance = previewIndex === null ? 4 : Math.min(Math.abs(index - previewIndex), 4);
          return <Tooltip.Root key={item.url} open={previewIndex === index}
            onOpenChange={open => {
              if (open && nav.current && getComputedStyle(nav.current).getPropertyValue('--toc-expanded').trim() === '1') return;
              setPreviewIndex(current => open ? index : current === index ? null : current);
            }}>
            <Tooltip.Trigger asChild>
              <a href={item.url} aria-current={activeUrl === item.url ? 'location' : undefined}
                className="group flex h-5 w-[52px] items-center text-sm leading-copy font-normal text-muted-foreground no-underline hover:text-foreground focus-visible:-outline-offset-2 aria-[current=location]:text-foreground @[10rem]/toc:h-auto @[10rem]/toc:w-full @[10rem]/toc:py-1 @[10rem]/toc:pr-3"
                onClick={event => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) setActiveUrl(item.url); }}>
                <span data-slot="lesson-toc-marker" aria-hidden className="pointer-events-none block h-[3px] w-[52px] origin-left shrink-0 bg-foreground/20 transition-transform duration-150 ease-out group-aria-[current=location]:bg-foreground motion-reduce:transition-none @[10rem]/toc:hidden"
                  style={{ transform: `scaleX(${markerWidths[distance] / 52})` }} />
                <span data-slot="lesson-toc-label" className="sr-only @[10rem]/toc:not-sr-only @[10rem]/toc:block @[10rem]/toc:min-w-0 @[10rem]/toc:wrap-anywhere">{item.title}</span>
              </a>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content data-slot="lesson-toc-title" side="right" sideOffset={12} collisionPadding={16} hideWhenDetached
                className="quote-frame not-prose z-40 max-w-[min(20rem,calc(100vw-2rem))] px-3 py-2 text-sm leading-copy font-normal text-foreground wrap-anywhere">
                {item.title}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>;
        })}
      </nav>
    </Tooltip.Provider>
  </aside>;
}
