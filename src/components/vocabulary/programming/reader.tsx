'use client';

import { useEffect, type ReactNode } from 'react';
import { SidebarInset } from '@/components/navigation/sidebar';
import { LessonRegion } from '@/components/course/course-layout';
import { LessonToc } from '@/components/course/outline/lesson-toc';
import { isProgrammingAnchor, type programmingTerm } from '@/lib/vocabulary/programming';
import { VocabularyDirectory } from '../directory';
import { useVocabularyNavigation } from '../navigation-state';
import { ProgrammingMobileNavigation } from './mobile-navigation';

type Term = NonNullable<ReturnType<typeof programmingTerm>>;

export function ProgrammingReader({ term, title, outline, outlineLabel, children }: {
  term: Term; title: string; outline: { title: string; url: string }[]; outlineLabel: string; children: ReactNode;
}) {
  const { query, onQueryChange } = useVocabularyNavigation();
  useEffect(() => {
    let disposed = false;
    // Restore a direct section link after fonts settle in the nested reading pane.
    void document.fonts.ready.then(() => {
      if (disposed) return;
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      if (isProgrammingAnchor(id)) document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    return () => { disposed = true; };
  }, [term.id]);

  return <>
    <VocabularyDirectory collection="programming" category={term.category} selected={term.id} query={query} onQueryChange={onQueryChange}
      onSelect={id => { if (window.location.hash !== `#${id}`) window.location.hash = id; document.getElementById(id)?.focus(); }} />
    <SidebarInset className="@container/reader min-w-0">
      <LessonToc items={outline} label={outlineLabel} />
      <LessonRegion title={title} hasToc>{children}</LessonRegion>
    </SidebarInset>
    <ProgrammingMobileNavigation />
  </>;
}
