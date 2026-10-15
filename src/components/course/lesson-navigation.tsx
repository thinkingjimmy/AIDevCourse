/**
 * [INPUT]: Ordered current-language lessons and the active stable lesson ID.
 * [OUTPUT]: Previous and next cards; the first lesson's previous card returns to the course introduction.
 * [POS]: Server-rendered lesson footer, independent of completion actions.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { CourseManifest } from '@/lib/content/types';
export async function LessonNavigation({ course, lessonId }: { course: CourseManifest; lessonId: string }) {
  const t = await getTranslations({ locale: course.locale, namespace: 'Ui' });
  const index = course.lessons.findIndex((lesson) => lesson.id === lessonId);
  const previous = course.lessons[index - 1];
  const next = course.lessons[index + 1];
  return <nav className="learn-pager" aria-label={t('menu')}>
    <Link href={previous?.url ?? course.url}><small>{t('previous')}</small><span><span aria-hidden>← </span>{previous?.title ?? course.title}</span></Link>
    <Link href={next?.url ?? course.url}><small>{t('next')}</small><span>{next?.title ?? course.title}<span aria-hidden> →</span></span></Link>
  </nav>;
}
