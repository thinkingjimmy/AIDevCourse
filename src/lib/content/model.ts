import type { Locale } from '../i18n/config';
import type { DocumentData } from './schema';
export type AchievementDefinition = {
  id: string; title: string; question: string;
  answer: string; explanation: string; takeaway: string;
  options: { value: string; label: string }[];
};
export type CourseAchievement = { id: string; lessonId: string; title: string; url: string };
export type ContentDocument = {
  file: string; locale: Locale; courseSlug: string; slug: string[]; url: string;
  data: DocumentData; headings: { id: string; title: string; depth: number }[];
  links: { url: string; image: boolean; label: string }[];
  body: string; sourceUrl: string; achievements: AchievementDefinition[]; hasJimmyNotes: boolean;
};
export type LessonSummary = {
  id: string; title: string; description: string; url: string;
  module: string; moduleTitle: string;
};
export type CourseManifest = {
  id: string; locale: Locale; slug: string; title: string; description: string; url: string;
  sourceLocale: Locale; level: 'beginner' | 'intermediate' | 'advanced';
  goals: string[]; audience: string; prerequisites: string[];
  lessons: LessonSummary[]; achievements: CourseAchievement[];
};
export type AchievementCourse = Pick<CourseManifest, 'id' | 'title' | 'achievements'>;
export type Translation = { locale: Locale; url: string; headings: string[] };
export type Catalog = {
  documents: ContentDocument[]; courses: CourseManifest[];
  translations: Record<string, Translation[]>; version: string;
};
export function globalAchievementCourses(catalog: Catalog, locale: Locale): AchievementCourse[] {
  const selected = new Map<string, CourseManifest>();
  for (const course of catalog.courses) {
    const current = selected.get(course.id);
    if (!current || course.locale === locale || current.locale !== locale && course.locale === course.sourceLocale) {
      selected.set(course.id, course);
    }
  }
  return [...selected.values()].map(({ id, title, achievements }) => ({ id, title, achievements }));
}
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
