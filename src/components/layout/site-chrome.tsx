/**
 * [INPUT]: Locale, shared header and footer, and the active route.
 * [OUTPUT]: Default chrome on interior pages, and none on the homepage shell.
 * [POS]: Keeps the framed homepage from mounting a second header, search shortcut, or footer.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
export function SiteChrome({ locale, header, footer, children }: {
  locale: Locale; header: ReactNode; footer: ReactNode; children: ReactNode;
}) {
  const pathname = usePathname();
  const home = pathname === `/${locale}` || pathname === `/${locale}/`;
  return <>{home ? null : header}{children}{home ? null : footer}</>;
}
