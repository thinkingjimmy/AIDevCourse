'use client';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useActiveHeading } from './use-active-heading';

export function LessonToc({ items, label }: {
  items: { title: ReactNode; url: string }[]; label: string;
}) {
  const nav = useRef<HTMLElement>(null);
  const urls = useMemo(() => items.map(item => item.url), [items]);
  const { activeUrl, setActiveUrl } = useActiveHeading(urls);

  useEffect(() => {
    function revealCurrent() {
      const link = nav.current?.querySelector('[aria-current="location"]');
      const scroller = nav.current?.closest<HTMLElement>('[data-slot="lesson-aside"]');
      if (!link?.getClientRects().length || !scroller || scroller.scrollHeight <= scroller.clientHeight) return;
      const item = link.getBoundingClientRect();
      const rail = scroller.getBoundingClientRect();
      if (item.top < rail.top) scroller.scrollTop += item.top - rail.top - 12;
      else if (item.bottom > rail.bottom) scroller.scrollTop += item.bottom - rail.bottom + 12;
    }
    const frame = window.requestAnimationFrame(revealCurrent);
    window.addEventListener('resize', revealCurrent);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('resize', revealCurrent); };
  }, [activeUrl]);

  return <div data-slot="lesson-toc" className="mb-7 hidden text-sm leading-body @[64rem]/lesson:block">
    <b className="m-0 mb-3 block text-sm leading-copy font-semibold">{label}</b>
    <nav ref={nav} aria-label={label} className="space-y-1 border-l border-border">
      {items.map(item => <a key={item.url} href={item.url} aria-current={activeUrl === item.url ? 'location' : undefined}
        className="-ml-px block border-l-2 border-transparent py-1 pr-1 pl-3 text-muted-foreground no-underline hover:text-foreground aria-[current=location]:border-foreground aria-[current=location]:font-medium aria-[current=location]:text-foreground"
        onClick={event => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) setActiveUrl(item.url); }}>
        {item.title}
      </a>)}
    </nav>
  </div>;
}
