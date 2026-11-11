'use client';

import { useRef, type ReactNode } from 'react';
import { SelectionMenu } from './selection-menu';
import { useLessonSelection } from './use-lesson-selection';

export function LessonArticle({ title, pageUrl, primary = true, children }: { title: string; pageUrl: string; primary?: boolean; children: ReactNode }) {
  const articleRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selection = useLessonSelection(articleRef, menuRef);
  return <article ref={articleRef} id={primary ? 'main-content' : undefined} className="block min-w-0 pt-9 pb-20 max-[961px]:pt-7 max-[961px]:pb-[72px]" tabIndex={-1}>
    {children}
    {selection && <SelectionMenu title={title} pageUrl={pageUrl} selection={selection} menuRef={menuRef} />}
  </article>;
}
