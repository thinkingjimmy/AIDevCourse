'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { SiteShell } from './page-primitives';
import { usePathname } from 'next/navigation';
import { canonicalPath, stripLocale } from '@/lib/i18n/routing';
const ErrorPageContext = createContext<ReactNode>(null);
const HomeHeaderContext = createContext<ReactNode>(null);
export function useErrorPage() { return useContext(ErrorPageContext); }
export function useHomeHeader() { return useContext(HomeHeaderContext); }
export function SiteFrame({ lessonPaths, header, footer, errorPage, children }: {
  lessonPaths: string[]; header: ReactNode; footer: ReactNode; errorPage: ReactNode; children: ReactNode;
}) {
  const pathname = canonicalPath(usePathname() ?? '/');
  const lesson = lessonPaths.includes(pathname);
  const page = stripLocale(pathname);
  const course = /^\/courses\/[^/]+$/.test(page);
  const open = page === '/';

  return <ErrorPageContext value={lesson ? <>{errorPage}{footer}</> : errorPage}>
    <HomeHeaderContext value={open ? header : null}>
      <SiteShell variant={lesson ? 'reading' : course ? 'course' : open ? 'open' : 'framed'}>
        {!open && header}
        {course ? <div data-slot="course-overview-body" className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">{children}{footer}</div>
          : <>{children}{!lesson && footer}</>}
      </SiteShell>
    </HomeHeaderContext>
  </ErrorPageContext>;
}
