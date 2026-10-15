/**
 * [INPUT]: Lesson children already wrapped by the parent course shell.
 * [OUTPUT]: The lesson route unchanged; the sidebar lives on the course layout.
 * [POS]: Pass-through so overview and lessons share one frame.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ReactNode } from 'react';
export default function LessonLayout({ children }: { children: ReactNode }) {
  return children;
}
