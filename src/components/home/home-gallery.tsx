'use client';
import { useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { CourseCard, type DiskCourse } from '@/components/course/course-card';
import { AuthorDialog } from '@/components/course/author-card';
import { HeroPrimaryAction } from '@/components/layout/page-primitives';
import { useHomeHeader } from '@/components/layout/site-frame';
import type { Locale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { Macintosh } from './macintosh';
import { canAnimateNavigation, useCourseTransition } from './course-transition';

export type GalleryLabels = {
  title: string; intro: string; start: string; opening: string; updating: string;
  previous: string; next: string; pagination: string; levels: Record<string, string>;
};
export function HomeGallery({ courses, locale, page, labels, startUrl, children }: {
  courses: (DiskCourse & { countLabel: string })[]; locale: Locale; page: number; labels: GalleryLabels; startUrl: string; children?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const masthead = useRef<HTMLElement>(null);
  const header = useHomeHeader();
  const [selected, setSelected] = useState<string>();
  const { phase, openCourse } = useCourseTransition();
  useLayoutEffect(() => {
    const element = masthead.current;
    if (!element) return;
    const updateHeight = () => document.documentElement.style.setProperty('--home-masthead-height', `${Math.ceil(element.getBoundingClientRect().height)}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--home-masthead-height');
    };
  }, []);
  const pages = Math.max(1, Math.ceil(courses.length / 9));
  const visible = courses.slice((page - 1) * 9, page * 9);
  const groups = ['introduction', 'beginner', 'intermediate', 'advanced'].map(section => ({
    section, courses: visible.filter(course => (course.section ?? course.level) === section),
  })).filter(group => group.courses.length);
  const navigate = (event: MouseEvent<HTMLAnchorElement>, course: DiskCourse) => {
    const home = root.current;
    if (!home || !canAnimateNavigation(event)) return;
    event.preventDefault();
    setSelected(course.title);
    void openCourse({ home, source: event.currentTarget, url: course.url });
  };
  const pageUrl = (number: number) => `${localePath(locale)}${number > 1 ? `?page=${number}` : ''}`;
  return <div ref={root} className="home-gallery" data-disk-phase={phase}>
    <header ref={masthead} data-slot="home-hero" className="gallery-hero">
      <div className="gallery-copy">
        <div className="gallery-heading">
          {header}
          <h1>{labels.title}</h1>
        </div>
        <p>{labels.intro}</p>
        <div className="gallery-actions">
          <HeroPrimaryAction href={startUrl} className="max-[721px]:w-auto">{labels.start}</HeroPrimaryAction>
          <AuthorDialog variant="text" />
        </div>
      </div>
      <div data-slot="home-hero-art" className="gallery-computer">
        <Macintosh title={selected} status={phase === 'idle' ? undefined : labels.opening} />
      </div>
    </header>
    <main id="main-content" tabIndex={-1} className="home-courses">
      <div id="catalog" className="disk-catalog">
        {children}
        {groups.map(group => <section className="disk-group" key={group.section} aria-labelledby={`courses-${group.section}`}>
          <h2 id={`courses-${group.section}`} className="disk-group-title">{labels.levels[group.section]}</h2>
          <div data-slot="course-grid" className="disk-grid">{group.courses.map(course => <CourseCard key={course.id} course={course}
            labels={{ level: labels.levels[course.section ?? course.level], status: course.lessonCount ? course.countLabel : labels.updating }}
            onClick={event => navigate(event, course)}
            onPointerEnter={event => { if (event.pointerType === 'mouse' && phase === 'idle') setSelected(course.title); }}
            onPointerLeave={() => { if (phase === 'idle') setSelected(undefined); }}
            onFocus={event => {
              if (phase !== 'idle') return;
              setSelected(course.title);
              if (event.currentTarget.matches(':focus-visible')) {
                const obscured = event.currentTarget.getBoundingClientRect().top < (masthead.current?.getBoundingClientRect().bottom ?? 0) + 12;
                event.currentTarget.scrollIntoView({ block: obscured ? 'start' : 'nearest', behavior: 'instant' });
              }
            }}
            onBlur={() => { if (phase === 'idle') setSelected(undefined); }} />)}</div>
        </section>)}
        {pages > 1 && <nav className="disk-pagination" aria-label={labels.pagination}>
          {page > 1 ? <Link href={pageUrl(page - 1)} aria-label={labels.previous} scroll={false}><ArrowLeftIcon size={16} aria-hidden /></Link> : <span aria-hidden><ArrowLeftIcon size={16} /></span>}
          <span aria-live="polite">{String(page).padStart(2, '0')} / {String(pages).padStart(2, '0')}</span>
          {page < pages ? <Link href={pageUrl(page + 1)} aria-label={labels.next} scroll={false}><ArrowRightIcon size={16} aria-hidden /></Link> : <span aria-hidden><ArrowRightIcon size={16} /></span>}
        </nav>}
      </div>
    </main>
  </div>;
}
