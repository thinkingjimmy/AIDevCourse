import { z } from 'zod';
import { locales } from '../i18n/config';
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const text = z.string().trim().min(1);
const common = {
  courseId: id, title: text, description: text,
};
export const courseSchema = z.object({
  ...common, sourceLocale: z.enum(locales),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  section: z.literal('introduction').optional(),
  updating: z.boolean().optional(),
  goals: z.array(text).min(1), audience: text, prerequisites: z.array(text).min(1),
}).strict().transform((data) => ({ ...data, kind: 'course' as const }));
export const lessonSchema = z.object({
  ...common, lessonId: id,
}).strict().transform((data) => ({ ...data, kind: 'lesson' as const }));
export const documentSchema = z.union([courseSchema, lessonSchema]);
export const metaSchema = z.object({
  title: text, pages: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
}).strict();
export type DocumentData = z.infer<typeof documentSchema>;
