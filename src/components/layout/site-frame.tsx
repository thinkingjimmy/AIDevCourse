/**
 * [INPUT]: Published lesson URLs, the zinc header and footer, and the active route, canonical locale paths.
 * [OUTPUT]: Shared header, rails, and footer for locale pages, including course overviews. Lessons use their own shell.
 * [POS]: Single shell so About, 404, and the error boundary share the sticky header. Lessons use the wiki shell.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import type { ReactNode } from 'react';
import { SiteShell } from './page-primitives';
import { usePathname } from 'next/navigation';
import { canonicalPath } from '@/lib/i18n/routing';
export function SiteFrame({ lessonPaths, header, footer, children }: {
  lessonPaths: string[]; header: ReactNode; footer: ReactNode; children: ReactNode;
}) {
  const pathname = canonicalPath(usePathname() ?? '/');
  if (lessonPaths.includes(pathname)) return children;
  return <SiteShell>{header}{children}{footer}</SiteShell>;
}
