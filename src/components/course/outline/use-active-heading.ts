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
    let frame = 0;
    let disposed = false;

    function update() {
      frame = 0;
      const readingLine = parseFloat(getComputedStyle(headings[0].element).scrollMarginTop) + 2;
      let current = headings[0].url;
      for (const heading of headings) {
        if (heading.element.getBoundingClientRect().top > readingLine) break;
        current = heading.url;
      }
      // The final heading cannot always reach the reading line on a short last section.
      if (window.scrollY > 0 && article && article.getBoundingClientRect().bottom <= window.innerHeight + 1) {
        current = headings[headings.length - 1].url;
      }
      setActiveUrl(current);
    }

    function schedule() {
      if (!disposed && !frame) frame = window.requestAnimationFrame(update);
    }

    const observer = new ResizeObserver(schedule);
    if (article) observer.observe(article);
    window.addEventListener('scroll', schedule, { passive: true });
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
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
      window.removeEventListener('pageshow', schedule);
      document.fonts.removeEventListener('loadingdone', schedule);
    };
  }, [urls]);

  return { activeUrl, setActiveUrl };
}
