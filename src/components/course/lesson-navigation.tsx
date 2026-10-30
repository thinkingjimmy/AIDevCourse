import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { getTranslations } from 'next-intl/server';
import type { CourseManifest } from '@/lib/content/model';
export async function LessonNavigation({ course, lessonId }: { course: CourseManifest; lessonId: string }) {
  const t = await getTranslations({ locale: course.locale, namespace: 'Ui' });
  const index = course.lessons.findIndex((lesson) => lesson.id === lessonId);
  const previous = course.lessons[index - 1];
  const next = course.lessons[index + 1];
  return <nav className="mt-5 flex max-w-none justify-between gap-6 border-t border-border pt-4 max-[961px]:flex-col" aria-label={t('menu')}>
    {previous && <Link className="group/pager block rounded-lg border-0 bg-transparent px-2.5 py-2 text-sm text-inherit no-underline transition-[background-color,color] duration-150 hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground last:ml-auto last:text-right max-[961px]:last:ml-0 max-[961px]:last:text-left" href={previous.url}><small className="mb-1 block text-xs text-muted-foreground group-hover/pager:text-strong group-focus-visible/pager:text-strong">{t('previous')}</small><span className="group-focus-visible/pager:underline group-focus-visible/pager:underline-offset-[3px]"><ArrowLeftIcon size={14} className="mr-1 inline align-[-2px]" aria-hidden />{previous.title}</span></Link>}
    <Link className="group/pager block rounded-lg border-0 bg-transparent px-2.5 py-2 text-sm text-inherit no-underline transition-[background-color,color] duration-150 hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground last:ml-auto last:text-right max-[961px]:last:ml-0 max-[961px]:last:text-left" href={next?.url ?? course.url}><small className="mb-1 block text-xs text-muted-foreground group-hover/pager:text-strong group-focus-visible/pager:text-strong">{t('next')}</small><span className="group-focus-visible/pager:underline group-focus-visible/pager:underline-offset-[3px]">{next?.title ?? course.title}<ArrowRightIcon size={14} className="ml-1 inline align-[-2px]" aria-hidden /></span></Link>
  </nav>;
}
