/**
 * [INPUT]: Lesson content, LearnShell, and the parent course frame and progress context.
 * [OUTPUT]: Lesson-only course sidebar and compact contents strip around the article.
 * [POS]: Navigation boundary for lesson routes; course overviews use the parent frame directly.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ReactNode } from 'react';
import { LearnShell } from '@/components/course/course-layout';
export default function LessonLayout({ children }: { children: ReactNode }) {
  return <LearnShell>{children}</LearnShell>;
}
