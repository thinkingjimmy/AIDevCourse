/**
 * [INPUT]: Validated metadata and the shared locale type.
 * [OUTPUT]: Serializable public content, manifest, and translation types.
 * [POS]: Contract between content processing and server/client consumers.
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
