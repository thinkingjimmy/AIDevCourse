'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SiteLogo } from './page-primitives';
import type { Locale } from '@/lib/i18n/config';
import { canonicalPath, localePath, stripLocale } from '@/lib/i18n/routing';
import { vocabularyForPath, type VocabularyKind } from '@/lib/vocabulary/collections';
import { site } from '@/lib/site-config';
import { canAnimateNavigation, useCourseTransition } from '@/components/home/course-transition';

export function SiteHeader({ locale, courses, labels, shortcut, children, hero = false }: {
  locale: Locale; courses: { url: string; title: string }[];
  labels: { home: string; navigation: string; vocabulary: Record<VocabularyKind, string> }; shortcut: ReactNode; children: ReactNode; hero?: boolean;
}) {
  const path = canonicalPath(usePathname());
  const { returnHome } = useCourseTransition();
  const course = courses.find(item => path === item.url || path.startsWith(`${item.url}/`));
  const vocabulary = vocabularyForPath(stripLocale(path));
  const logo = <SiteLogo href={localePath(locale)} prefetch={vocabulary ? false : undefined} aria-label={`${site.name} · ${labels.home}`} className="site-header-logo"
    onClick={event => {
      if ((!course && !vocabulary) || !canAnimateNavigation(event)) return;
      event.preventDefault();
      void returnHome({ source: event.currentTarget, url: localePath(locale) });
    }} />;
  if (hero) return <>{logo}{shortcut}</>;
  return <header data-slot="site-header" data-course={course ? '' : undefined} data-vocabulary={vocabulary ? '' : undefined} className="site-header">
    <div className="site-header-inner">
      {logo}
      {(course || vocabulary) && <div className="mac-window-heading"><span>{course?.title ?? (vocabulary && labels.vocabulary[vocabulary.id])}</span></div>}
      <nav className="site-header-tools" aria-label={labels.navigation}>{children}</nav>
      {!vocabulary && shortcut}
    </div>
  </header>;
}
