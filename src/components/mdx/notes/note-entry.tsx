'use client';

import { useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNoteScope } from './note-scope';

export function NoteEntry({ anchor, children }: { anchor: string; children: ReactNode }) {
  const { rail, register, registerCard } = useNoteScope();
  useEffect(() => register(anchor, children), [anchor, children, register]);
  const ref = useCallback((element: HTMLDivElement | null) => registerCard(anchor, element), [anchor, registerCard]);

  return rail ? createPortal(
    <div ref={ref} data-jimmy-note-card={anchor} className="invisible absolute inset-x-0 top-0">
      <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute inset-0 size-full overflow-visible text-note-connector">
        <path data-note-connector={anchor} fill="none" stroke="currentColor" strokeWidth="var(--note-line-width)" strokeLinecap="round" strokeLinejoin="round" />
        <circle data-note-connector-start="" r={3} fill="currentColor" />
      </svg>
      {children}
    </div>,
    rail,
  ) : null;
}
