'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { SiteShell } from './page-primitives';
import { usePathname } from 'next/navigation';
import { canonicalPath, stripLocale, type HomeView } from '@/lib/i18n/routing';
import { vocabularyForPath } from '@/lib/vocabulary/collections';
const ErrorPageContext = createContext<ReactNode>(null);
const HomeHeaderContext = createContext<ReactNode>(null);
const HomeDestinationContext = createContext<HomeView>('courses');
export function useErrorPage() { return useContext(ErrorPageContext); }
export function useHomeHeader() { return useContext(HomeHeaderContext); }
export function useHomeDestination() { return useContext(HomeDestinationContext); }
export function SiteFrame({ lessonPaths, blogPath, header, homeHeader, footer, errorPage, children }: {
  lessonPaths: string[]; blogPath?: string; header: ReactNode; homeHeader: ReactNode; footer: ReactNode; errorPage: ReactNode; children: ReactNode;
}) {
  const pathname = canonicalPath(usePathname() ?? '/');
  const lesson = lessonPaths.includes(pathname);
  const page = stripLocale(pathname);
  const course = /^\/courses\/[^/]+$/.test(page);
  const vocabulary = vocabularyForPath(page);
  const reading = lesson || Boolean(vocabulary);
  const open = page === '/';
  const blog = blogPath && (pathname === blogPath || (lesson && pathname.startsWith(`${blogPath}/`)));
  const resources = Boolean(blog || vocabulary);

  const recovery = open ? <>{header}{errorPage}</> : reading ? <>{errorPage}{footer}</> : errorPage;
  return <ErrorPageContext value={recovery}>
    <HomeHeaderContext value={open ? homeHeader : null}>
      <HomeDestinationContext value={resources ? 'resources' : 'courses'}>
        <SiteShell variant={reading ? 'reading' : course ? 'course' : open ? 'open' : 'framed'} data-site-theme={resources ? 'ps2' : undefined}>
          {!open && header}
          {course ? <div data-slot="course-overview-body" className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">{children}{footer}</div>
            : <>{children}{!reading && footer}</>}
        </SiteShell>
      </HomeDestinationContext>
    </HomeHeaderContext>
  </ErrorPageContext>;
}
