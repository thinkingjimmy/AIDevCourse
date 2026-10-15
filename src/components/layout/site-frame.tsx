/**
 * [INPUT]: Locale, the zinc header and footer, and the active route.
 * [OUTPUT]: The homepage frame on every locale page, without a second footer on course and lesson routes.
 * [POS]: Single shell so About, 404, and the error boundary share the sticky header.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
export function SiteFrame({ locale, header, footer, children }: {
  locale: Locale; header: ReactNode; footer: ReactNode; children: ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const learning = pathname.startsWith(`/${locale}/courses/`);
  return <div className={learning ? 'home-shell learn-page' : 'home-shell'}>{header}{children}{learning ? null : footer}</div>;
}
