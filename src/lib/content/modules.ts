/**
 * [INPUT]: Ordered lesson summaries and a course slug.
 * [OUTPUT]: Module groups with 1.1-style indexes, plus a short breadcrumb label.
 * [POS]: Shared by the course index, overview rows, and server-rendered lesson eyebrows.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { LessonSummary } from './types';
export function courseLabel(slug: string) {
  const [head, ...rest] = slug.split('-').filter(Boolean);
  if (!head) return slug;
  const first = head.length <= 3 ? head.toUpperCase() : `${head.charAt(0).toUpperCase()}${head.slice(1)}`;
  return rest.length ? `${first} ${rest.join(' ')}` : first;
}
export function groupModules(lessons: LessonSummary[]) {
  const groups: { module: string; title: string; lessons: { lesson: LessonSummary; number: number; part: string }[] }[] = [];
  lessons.forEach((lesson, index) => {
    const group = groups.find((item) => item.module === lesson.module);
    const entry = { lesson, number: index + 1, part: '' };
    if (group) group.lessons.push(entry); else groups.push({ module: lesson.module, title: lesson.moduleTitle, lessons: [entry] });
  });
  groups.forEach((group, groupIndex) => group.lessons.forEach((entry, lessonIndex) => { entry.part = `${groupIndex + 1}.${lessonIndex + 1}`; }));
  return groups;
}
