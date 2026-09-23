/**
 * [INPUT]: Zod and the shared locale whitelist.
 * [OUTPUT]: Strict course, lesson, and directory metadata schemas.
 * [POS]: Authoring contract reused by the validator and MDX compiler.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { z } from 'zod';
import { locales } from '../i18n/config';
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const text = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Expected a real calendar date');
const common = {
  courseId: id, title: text, description: text, draft: z.boolean(),
  contentRevision: z.number().int().positive().optional(),
  translatedFromRevision: z.number().int().positive().optional(),
};
export const courseSchema = z.object({
  ...common, kind: z.literal('course'), sourceLocale: z.enum(locales),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  goals: z.array(text).min(1), audience: text, prerequisites: z.array(text).min(1),
}).strict();
export const lessonSchema = z.object({
  ...common, kind: z.literal('lesson'), lessonId: id,
  durationMinutes: z.number().int().positive(), lessonType: z.enum(['concept', 'tool', 'practice']),
  lastVerified: date.optional(), testedWith: text.optional(),
}).strict().superRefine((value, ctx) => {
  if (value.lessonType === 'tool' && (!value.lastVerified || !value.testedWith)) {
    ctx.addIssue({ code: 'custom', message: 'Tool lessons require real lastVerified and testedWith values' });
  }
});
export const documentSchema = z.union([courseSchema, lessonSchema]);
export const metaSchema = z.object({
  title: text, pages: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
}).strict();
export type DocumentData = z.infer<typeof documentSchema>;
