/**
 * [INPUT]: Lesson children and the course progress context from the parent course layout.
 * [OUTPUT]: The components/course reading shell around every lesson route.
 * [POS]: Lesson-only layout; the course overview stays outside the sidebar shell.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ReactNode } from 'react';
import { ReadingLayout } from '@/components/course/course-layout';
export default function LessonLayout({ children }: { children: ReactNode }) {
  return <ReadingLayout>{children}</ReadingLayout>;
}
