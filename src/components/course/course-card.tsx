/**
 * [INPUT]: A localized course manifest, shared Card parts and theme tokens, and the course hero illustration.
 * [OUTPUT]: A linked horizontal course card with left-side text and a full-height zinc illustration panel on the right. The chip has no leader lines or names.
 * [POS]: Server-rendered catalog entry; course metadata also supplies the overview hero.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { CourseManifest } from '@/lib/content/types';
import { Card, CardContent } from '@/components/ui/surfaces/card';
import { ChipExplode } from './chip-explode';

export async function CourseCard({ course }: { course: CourseManifest }) {
  const t = await getTranslations({ locale: course.locale, namespace: 'Course' });
  const ui = await getTranslations({ locale: course.locale, namespace: 'Ui' });
  const titleId = `course-${course.slug}`;
  return <Link href={course.url} aria-labelledby={titleId} className="group block h-full min-w-0 text-inherit no-underline">
    <Card className="h-full flex-row group-hover:border-ring group-focus-visible:border-ring">
      <CardContent className="min-w-0 flex-1 p-5">
        <p className="m-0 mb-3 font-mono text-[12px] text-muted-foreground">{ui(course.level)} · {t('free')}</p>
        <h3 id={titleId} className="m-0 text-[24px] leading-[1.2] font-semibold tracking-[-.02em]">{course.title}</h3>
        <p className="m-0 mt-2.5 text-[14px] leading-[1.75] text-muted-foreground">{course.description}</p>
      </CardContent>
      {course.slug === 'ai-101' && <div data-slot="course-card-image" className="flex w-[38%] shrink-0 self-stretch items-center overflow-hidden bg-muted p-3">
        <div className="relative aspect-[580/570] w-full"><ChipExplode callouts={false} /></div>
      </div>}
    </Card>
  </Link>;
}
