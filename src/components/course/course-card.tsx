/**
 * [INPUT]: A localized course manifest, shared Card parts and theme tokens, and the LLM 101 hero illustration.
 * [OUTPUT]: A linked course card with whole-card chip hover motion, an illustration panel without callouts, and offset depth on hover or keyboard focus.
 * [POS]: Server-rendered catalog entry; course metadata also supplies the overview hero.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { CourseManifest } from '@/lib/content/model';
import { Card, CardContent } from '@/components/ui/card';
import { ChipExplode } from '../illustrations/chip-explode';

export async function CourseCard({ course }: { course: CourseManifest }) {
  const t = await getTranslations({ locale: course.locale, namespace: 'Course' });
  const ui = await getTranslations({ locale: course.locale, namespace: 'Ui' });
  const titleId = `course-${course.slug}`;
  return <Link href={course.url} aria-labelledby={titleId} data-illustration-hover className="group block h-full min-w-0 text-inherit no-underline">
    <Card className="h-full flex-row group-hover:border-ring group-hover:shadow-[4px_4px_0_var(--line)] group-focus-visible:border-ring group-focus-visible:shadow-[4px_4px_0_var(--line)]">
      <CardContent className="min-w-0 flex-1 p-5">
        <p className="m-0 mb-3 font-mono text-xs text-muted-foreground">{ui(course.level)} · {t('free')}</p>
        <h3 id={titleId} className="m-0 text-2xl leading-heading font-semibold tracking-tight">{course.title}</h3>
        <p className="m-0 mt-2.5 text-sm leading-body text-muted-foreground">{course.description}</p>
      </CardContent>
      {course.slug === 'llm-101' && <div data-slot="course-card-image" className="flex w-[38%] shrink-0 self-stretch items-center overflow-hidden bg-muted p-3">
        <div className="relative aspect-[580/570] w-full"><ChipExplode callouts={false} /></div>
      </div>}
    </Card>
  </Link>;
}
