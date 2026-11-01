'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useNoteLayout } from './use-note-layout';

type NoteContext = {
  entries: ReadonlyMap<string, ReactNode>;
  openId: string | null;
  rail: HTMLElement | null;
  register: (id: string, body: ReactNode) => () => void;
  registerCard: (id: string, element: HTMLDivElement | null) => void;
  setOpen: (id: string, open: boolean) => void;
};

const Context = createContext<NoteContext | null>(null);

export function useNoteScope() {
  const scope = useContext(Context);
  if (!scope) throw new Error('JimmyNote and JimmyNoteAnchor require NoteScope.');
  return scope;
}

export function NoteScope({ children, ...props }: ComponentProps<'div'>) {
  const root = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<ReadonlyMap<string, ReactNode>>(() => new Map());
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);
  const { rail, registerCard } = useNoteLayout(root, close);
  const register = useCallback((id: string, body: ReactNode) => {
    setEntries(current => new Map(current).set(id, body));
    return () => setEntries(current => {
      if (current.get(id) !== body) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);
  const setOpen = useCallback((id: string, open: boolean) => {
    setOpenId(current => open ? id : current === id ? null : current);
  }, []);
  const context = useMemo(() => ({ entries, openId, rail, register, registerCard, setOpen }), [entries, openId, rail, register, registerCard, setOpen]);

  return <Context.Provider value={context}>
    <div {...props} ref={root} data-note-mode={rail ? 'rail' : 'popover'}>{children}</div>
  </Context.Provider>;
}

export function NoteRail({ className, ...props }: Omit<ComponentProps<'div'>, 'children'>) {
  return <div {...props} data-slot="lesson-rail" className={cn('relative hidden min-w-0 self-stretch @[64rem]/lesson:block', className)}>
    <div data-slot="jimmy-note-rail" className="absolute inset-x-0 top-0" />
  </div>;
}
