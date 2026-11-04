'use client';
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { SiteShell } from './page-primitives';
import { usePathname } from 'next/navigation';
import { canonicalPath, stripLocale } from '@/lib/i18n/routing';
const ErrorPageContext = createContext<ReactNode>(null);
export function useErrorPage() { return useContext(ErrorPageContext); }
export function SiteFrame({ lessonPaths, header, footer, errorPage, children }: {
  lessonPaths: string[]; header: ReactNode; footer: ReactNode; errorPage: ReactNode; children: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const pathname = canonicalPath(usePathname() ?? '/');
  const lesson = lessonPaths.includes(pathname);
  const page = stripLocale(pathname);
  const open = page === '/' || /^\/courses\/[^/]+$/.test(page);

  useEffect(() => {
    const shell = frame.current;
    const header = shell?.querySelector<HTMLElement>(':scope > header');
    if (!lesson || !shell || !header) return;
    let request = 0;
    let previous = -1;
    const measure = () => {
      request = 0;
      const offset = Math.max(0, header.getBoundingClientRect().bottom);
      if (offset === previous) return;
      previous = offset;
      shell.style.setProperty('--lesson-header-offset', `${offset}px`);
    };
    const schedule = () => { if (!request) request = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(header);
    // Keep the fixed sidebar below the visible portion of the scrolling header.
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(request);
      shell.style.removeProperty('--lesson-header-offset');
    };
  }, [lesson, pathname]);

  return <ErrorPageContext value={lesson ? <>{errorPage}{footer}</> : errorPage}>
    <SiteShell ref={frame} variant={lesson ? 'reading' : open ? 'open' : 'framed'}>{header}{children}{!lesson && footer}</SiteShell>
  </ErrorPageContext>;
}
