/**
 * [INPUT]: Ordered current-language lessons and the active stable lesson ID.
 * [OUTPUT]: Previous/next links with explicit first/last boundaries; the next lesson is the prominent card.
 * [POS]: Server-rendered lesson footer, independent of completion actions.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { CourseManifest } from '@/lib/content/types';
export async function LessonNavigation({ course, lessonId }: { course: CourseManifest; lessonId: string }) {
  const t = await getTranslations({ locale: course.locale, namespace: 'Ui' });
  const index = course.lessons.findIndex((lesson) => lesson.id === lessonId);
  const previous = course.lessons[index - 1];
  const next = course.lessons[index + 1];
  return <nav className="lesson-pagination" aria-label={t('menu')}>
    <Link className="previous" href={previous?.url ?? course.url}><small><ArrowLeft size={14} aria-hidden />{t(previous ? 'previous' : 'overview')}</small><span>{previous?.title ?? course.title}</span></Link>
    <Link className="next" href={next?.url ?? course.url}><span>
      <small>{next ? `${t('next')} · ${t(next.type)} · ${t('minutes', { count: next.durationMinutes })}` : t('overview')}</small>
      <span className="serif">{next?.title ?? course.title}</span>
    </span><ArrowRight size={22} aria-hidden /></Link>
  </nav>;
}
