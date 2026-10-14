/**
 * [INPUT]: A direct scan of content/zh, separate from the live homepage.
 * [OUTPUT]: The real AI coding course, its lessons, and the homepage facts used by design previews.
 * [POS]: Design-only reader. It is not used by the live home.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { cache } from 'react';
import { join } from 'node:path';
import { scanContent } from '@/lib/content/scan';
import type { ContentDocument } from '@/lib/content/types';

export const levelLabel = { beginner: '入门', intermediate: '进阶', advanced: '高级' } as const;
export const typeLabel = { concept: '概念', tool: '工具', practice: '练习' } as const;

export const tracks = [
  { id: 'ai-coding', title: 'AI coding', pending: false },
  { id: 'llm', title: 'LLM', pending: true, note: '模型、上下文与提示。目录里还没有课时。' },
  { id: 'agents', title: 'AI agents', pending: true, note: '把任务交给代理之前，先能检查它的改动。目录里还没有课时。' },
] as const;

export const principles = [
  { id: 'free', title: '免费阅读', body: '无需注册，打开就能读。' },
  { id: 'local', title: '记录在本机', body: '完成标记和上次位置保存在这台浏览器，不会上传。' },
  { id: 'languages', title: '五种界面语言', body: 'English、简体中文、日本語、Français、Español。正文目前是简体中文。' },
  { id: 'privacy', title: '没有追踪', body: '不接入广告或分析脚本，只用一个 Cookie 记住语言。' },
] as const;

export type DesignSample = { lang: string; code: string };
export type DesignCallout = { title: string; body: string };
export type DesignLesson = {
  id: string; number: string; title: string; description: string; durationMinutes: number;
  type: keyof typeof typeLabel; moduleTitle: string; opening: string;
  quote: string; samples: DesignSample[]; callout: DesignCallout | null;
};
export type DesignModule = { title: string; lessons: DesignLesson[] };
export type DesignCourse = {
  id: string; title: string; description: string; level: keyof typeof levelLabel;
  audience: string; prerequisites: string[]; goals: string[];
  intro: string; closing: string; lessons: DesignLesson[]; modules: DesignModule[];
  durationMinutes: number;
};

function proseParagraphs(body: string) {
  const plain = body.replace(/```[\s\S]*?```/g, '').replace(/<[^>\n]+>/g, '');
  const paragraphs: string[] = [];
  for (const chunk of plain.split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean)
      .filter((line) => !line.startsWith('#') && !line.startsWith('|') && !line.startsWith('- ') && !line.startsWith('> ') && !line.startsWith('!['));
    if (lines.length) paragraphs.push(lines.join(''));
  }
  return paragraphs;
}

function lessonFrom(doc: ContentDocument, moduleTitle: string, index: number): DesignLesson {
  if (doc.data.kind !== 'lesson') throw new Error(`Expected a lesson: ${doc.file}`);
  const paragraphs = proseParagraphs(doc.body);
  const quote = doc.body.split('\n').find((line) => line.startsWith('> '))?.slice(2).trim() ?? '';
  const samples = [...doc.body.matchAll(/```([^\n]*)\n([\s\S]*?)```/g)].map((match) => ({ lang: match[1].trim() || 'text', code: match[2].replace(/\s+$/, '') }));
  const calloutMatch = doc.body.match(/<Callout([^>]*)>([\s\S]*?)<\/Callout>/);
  return {
    id: doc.data.lessonId, number: String(index + 1).padStart(2, '0'), title: doc.data.title, description: doc.data.description,
    durationMinutes: doc.data.durationMinutes, type: doc.data.lessonType, moduleTitle, opening: paragraphs[0] ?? doc.data.description,
    quote, samples, callout: calloutMatch ? { title: calloutMatch[1].match(/title="([^"]*)"/)?.[1] ?? '', body: calloutMatch[2].trim() } : null,
  };
}

export const loadDesignCourse = cache((): DesignCourse => {
  const scan = scanContent(join(process.cwd(), 'content'));
  const courseDoc = scan.documents.find((doc) => doc.locale === 'zh' && doc.courseSlug === 'ai-coding' && doc.data.kind === 'course');
  if (!courseDoc || courseDoc.data.kind !== 'course') throw new Error('content/zh/ai-coding is missing a course index');
  const order = scan.order.get('zh') ?? [];
  const lessons = scan.documents
    .filter((doc) => doc.locale === 'zh' && doc.courseSlug === 'ai-coding' && doc.data.kind === 'lesson')
    .sort((a, b) => order.indexOf(a.file) - order.indexOf(b.file))
    .map((doc, index) => {
      const modulePath = doc.slug.slice(0, -1).join('/');
      const moduleTitle = scan.labels.get(`zh/ai-coding${modulePath ? `/${modulePath}` : ''}`) ?? courseDoc.data.title;
      return lessonFrom(doc, moduleTitle, index);
    });
  const modules: DesignModule[] = [];
  for (const lesson of lessons) {
    const last = modules.at(-1);
    if (!last || last.title !== lesson.moduleTitle) modules.push({ title: lesson.moduleTitle, lessons: [lesson] });
    else last.lessons.push(lesson);
  }
  const paragraphs = proseParagraphs(courseDoc.body);
  return {
    id: courseDoc.data.courseId, title: courseDoc.data.title, description: courseDoc.data.description,
    level: courseDoc.data.level, audience: courseDoc.data.audience, prerequisites: courseDoc.data.prerequisites,
    goals: courseDoc.data.goals, intro: paragraphs[0] ?? courseDoc.data.description, closing: paragraphs[1] ?? '',
    lessons, modules, durationMinutes: lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0),
  };
});
