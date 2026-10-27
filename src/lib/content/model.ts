/**
 * [INPUT]: Validated metadata, the shared locale type, and ordered lesson summaries.
 * [OUTPUT]: Content models, stable identities, rendered anchors, and module grouping.
 * [POS]: Framework-free contract shared by content processing and server/client consumers.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { Locale } from '../i18n/config';
import type { DocumentData } from './schema';
export type ContentDocument = {
  file: string; locale: Locale; courseSlug: string; slug: string[]; url: string;
  data: DocumentData; headings: { id: string; title: string; depth: number }[];
  links: { url: string; image: boolean; label: string }[];
  body: string; stale: boolean; sourceUrl: string;
};
export type LessonSummary = {
  id: string; title: string; description: string; url: string; durationMinutes: number;
  type: 'concept' | 'tool' | 'practice'; module: string; moduleTitle: string;
};
export type CourseManifest = {
  id: string; locale: Locale; slug: string; title: string; description: string; url: string;
  sourceLocale: Locale; level: 'beginner' | 'intermediate' | 'advanced';
  goals: string[]; audience: string; prerequisites: string[];
  lessons: LessonSummary[]; durationMinutes: number;
};
export type Translation = { locale: Locale; url: string; headings: string[] };
export type Catalog = {
  documents: ContentDocument[]; courses: CourseManifest[];
  translations: Record<string, Translation[]>; warnings: string[]; version: string;
};
export function identity(document: ContentDocument) {
  return document.data.kind === 'course' ? document.data.courseId : `${document.data.courseId}:${document.data.lessonId}`;
}

export function renderedAnchors(document: ContentDocument) {
  return document.data.kind === 'course' ? ['course-catalog'] : document.headings.map((heading) => heading.id);
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
