/**
 * [INPUT]: Server-rendered band content and optional inner layout classes.
 * [OUTPUT]: Full-bleed band whose lines span the viewport, with content and corner marks held inside the rails.
 * [POS]: Shared structural surface for home, library, about, and course overview pages.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ReactNode } from 'react';
export function GridFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className="grid-frame"><div className={`frame-inner ${className}`}>
    <span className="grid-cross left" aria-hidden /><span className="grid-cross right" aria-hidden />
    {children}
    <span className="grid-cross left bottom" aria-hidden /><span className="grid-cross right bottom" aria-hidden />
  </div></div>;
}
