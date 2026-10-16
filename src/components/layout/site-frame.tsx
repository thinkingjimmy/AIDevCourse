/**
 * [INPUT]: Locale, the zinc header and footer, and the active route.
 * [OUTPUT]: Shared header, rails, and footer for locale pages, including course overviews. Lessons use their own shell.
 * [POS]: Single shell so About, 404, and the error boundary share the sticky header. Lessons use the wiki shell.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import type { ReactNode } from 'react';
import { SiteShell } from './page-primitives';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
export function SiteFrame({ locale, header, footer, children }: {
  locale: Locale; header: ReactNode; footer: ReactNode; children: ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const lesson = new RegExp(`^/${locale}/courses/[^/]+/.+`).test(pathname);
  if (lesson) return children;
  return <SiteShell>{header}{children}{footer}</SiteShell>;
}
