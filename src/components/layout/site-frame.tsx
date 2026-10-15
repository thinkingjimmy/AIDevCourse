/**
 * [INPUT]: Locale, the zinc header and footer, and the active route.
 * [OUTPUT]: The homepage frame on locale pages. Lesson routes render without the site header, rails, or footer.
 * [POS]: Single shell so About, 404, and the error boundary share the sticky header. Lessons use the wiki shell.
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
  const lesson = new RegExp(`^/${locale}/courses/[^/]+/.+`).test(pathname);
  if (lesson) return children;
  const course = pathname.startsWith(`/${locale}/courses/`);
  return <div className={course ? 'home-shell learn-page' : 'home-shell'}>{header}{children}{course ? null : footer}</div>;
}
