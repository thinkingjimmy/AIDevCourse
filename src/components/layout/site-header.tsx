'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SiteLogo } from './page-primitives';
import type { Locale } from '@/lib/i18n/config';
import { canonicalPath, localePath } from '@/lib/i18n/routing';
import { site } from '@/lib/site-config';
import { canAnimateNavigation, useCourseTransition } from '@/components/home/course-transition';

export function SiteHeader({ locale, courses, labels, shortcut, children }: {
  locale: Locale; courses: { url: string; title: string }[];
  labels: { home: string; navigation: string }; shortcut: ReactNode; children: ReactNode;
}) {
  const path = canonicalPath(usePathname());
  const { returnHome } = useCourseTransition();
  const course = courses.find(item => path === item.url || path.startsWith(`${item.url}/`));
  const logo = <SiteLogo href={localePath(locale)} aria-label={`${site.name} · ${labels.home}`} className="site-header-logo"
    onClick={event => {
      if (!course || !canAnimateNavigation(event)) return;
      event.preventDefault();
      void returnHome({ source: event.currentTarget, url: localePath(locale) });
    }} />;
  if (path === localePath(locale)) return <>{logo}{shortcut}</>;
  return <header data-slot="site-header" data-course={course ? '' : undefined} className="site-header">
    <div className="site-header-inner">
      {logo}
      {course && <div className="mac-window-heading"><span>{course.title}</span></div>}
      <nav className="site-header-tools" aria-label={labels.navigation}>{children}</nav>
      {shortcut}
    </div>
  </header>;
}
