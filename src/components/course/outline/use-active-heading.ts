'use client';
import { useEffect, useState } from 'react';

export function useActiveHeading(urls: readonly string[]) {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);

  useEffect(() => {
    const headings = urls.flatMap(url => {
      const element = document.getElementById(decodeURIComponent(url.slice(1)));
      return element ? [{ url, element }] : [];
    });
    if (!headings.length) return;
    const article = headings[0].element.closest('article');
    const pane = article?.closest<HTMLElement>('[data-slot="lesson-region"]');
    if (!article || !pane) return;
    let frame = 0;
    let disposed = false;

    const update = () => {
      frame = 0;
      const bounds = pane.getBoundingClientRect();
      const readingLine = bounds.top + parseFloat(getComputedStyle(headings[0].element).scrollMarginTop) + 2;
      let current = headings[0].url;
      for (const heading of headings) {
        if (heading.element.getBoundingClientRect().top > readingLine) break;
        current = heading.url;
      }
      // The final heading cannot always reach the reading line on a short last section.
      if (pane.scrollTop > 0 && article.getBoundingClientRect().bottom <= bounds.bottom + 1) {
        current = headings[headings.length - 1].url;
      }
      setActiveUrl(current);
    };

    function schedule() {
      if (!disposed && !frame) frame = window.requestAnimationFrame(update);
    }

    const observer = new ResizeObserver(schedule);
    observer.observe(article);
    observer.observe(pane);
    pane.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    window.addEventListener('pageshow', schedule);
    document.fonts.addEventListener('loadingdone', schedule);
    void document.fonts.ready.then(schedule);
    schedule();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      pane.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
      window.removeEventListener('pageshow', schedule);
      document.fonts.removeEventListener('loadingdone', schedule);
    };
  }, [urls]);

  return { activeUrl, setActiveUrl };
}
