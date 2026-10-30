'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { SiteShell } from './page-primitives';
import { usePathname } from 'next/navigation';
import { canonicalPath } from '@/lib/i18n/routing';
const ErrorPageContext = createContext<ReactNode>(null);
export function useErrorPage() { return useContext(ErrorPageContext); }
export function SiteFrame({ lessonPaths, header, footer, errorPage, children }: {
  lessonPaths: string[]; header: ReactNode; footer: ReactNode; errorPage: ReactNode; children: ReactNode;
}) {
  const pathname = canonicalPath(usePathname() ?? '/');
  const lesson = lessonPaths.includes(pathname);
  return <ErrorPageContext value={lesson ? <SiteShell>{header}{errorPage}{footer}</SiteShell> : errorPage}>
    {lesson ? children : <SiteShell>{header}{children}{footer}</SiteShell>}
  </ErrorPageContext>;
}
