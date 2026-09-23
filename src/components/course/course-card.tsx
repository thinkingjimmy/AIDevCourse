/**
 * [INPUT]: A single public, language-local course manifest; progress provider, controls, and sibling syllabus.tsx.
 * [OUTPUT]: Course card with facts, a progress-aware continue action, and the compact lesson path.
 * [POS]: Shared discovery component for home and course-list pages.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { BookOpen, Clock3 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { CourseManifest } from '@/lib/content/types';
import { ProgressProvider } from '../progress/progress-provider';
import { ContinueLink } from '../progress/progress-controls';
import { Syllabus } from './syllabus';
export async function CourseCard({ course, index }: { course: CourseManifest; index: number }) {
  const ui = await getTranslations({ locale: course.locale, namespace: 'Ui' });
  return <ProgressProvider course={course}><article className="course-card">
    <div className="course-card-info">
      <div className="card-top"><span className="mono">{String(index + 1).padStart(2, '0')}</span><span className="chip">{ui(course.level)}</span></div>
      <h3 className="serif"><Link href={course.url}>{course.title}</Link></h3>
      <p>{course.description}</p>
      <div className="card-meta"><span><BookOpen size={15} aria-hidden />{ui('lessonCount', { count: course.lessons.length })}</span><span><Clock3 size={15} aria-hidden />{ui('minutes', { count: course.durationMinutes })}</span></div>
      <p className="card-audience">{course.audience}</p>
      <div className="card-actions"><ContinueLink /><Link className="text-link" href={course.url}>{ui('overview')}</Link></div>
    </div>
    <div className="course-card-path"><Syllabus /></div>
  </article></ProgressProvider>;
}
