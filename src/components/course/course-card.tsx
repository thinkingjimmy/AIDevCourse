import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { CourseManifest } from '@/lib/content/model';
import { Card, CardContent } from '@/components/ui/card';
import { MacExplode } from '../illustrations/mac-explode';
import { ChipExplode } from '../illustrations/chip-explode';
import { RocketExplode } from '../illustrations/rocket-explode';
import { ServoExplode } from '../illustrations/servo/servo-explode';

export async function CourseCard({ course }: { course: CourseManifest }) {
  const t = await getTranslations({ locale: course.locale, namespace: 'Course' });
  const ui = await getTranslations({ locale: course.locale, namespace: 'Ui' });
  const titleId = `course-${course.slug}`;
  const isIntroduction = course.section === 'introduction';
  const hasImage = isIntroduction || course.slug === 'llm-101' || course.slug === 'coding-101' || course.slug === 'agent-101';
  return <Link href={course.url} aria-labelledby={titleId} data-illustration-hover="expand" className="group block h-full min-w-0 text-inherit no-underline">
    <Card className="h-full group-hover:border-ring group-hover:shadow-[4px_4px_0_var(--line)] group-focus-visible:border-ring group-focus-visible:shadow-[4px_4px_0_var(--line)] max-[721px]:border-x-0">
      <CardContent className={`grid min-w-0 flex-1 grid-rows-[auto_1fr] p-0 ${hasImage ? 'grid-cols-[minmax(0,1fr)_38%] max-[721px]:grid-cols-[minmax(0,1fr)_clamp(112px,32vw,128px)]' : 'grid-cols-1'}`}>
        <div data-slot="course-card-heading" className="min-w-0 px-5 pt-5 max-[721px]:pt-4 max-[721px]:pr-3 max-[721px]:pl-4">
          <p className="m-0 mb-3 font-mono text-xs text-muted-foreground max-[721px]:mb-2">{ui(course.section ?? course.level)} · {t('free')}</p>
          <h3 id={titleId} className="m-0 text-2xl leading-heading font-semibold tracking-tight text-balance max-[721px]:text-[1.375rem]">{course.title}</h3>
        </div>
        <p data-slot="course-card-description" className="col-start-1 row-start-2 m-0 mt-2.5 px-5 pb-5 text-sm leading-body text-muted-foreground max-[721px]:mt-2 max-[721px]:pr-3 max-[721px]:pb-4 max-[721px]:pl-4 max-[721px]:text-ui max-[721px]:leading-copy max-[721px]:text-reading">{course.description}</p>
        {hasImage && <div data-slot="course-card-image" className="relative col-start-2 row-span-2 row-start-1 flex min-w-0 items-center justify-center overflow-hidden bg-anatomy-surface p-3 max-[721px]:p-0 max-[721px]:[container-type:inline-size]">
          <div data-slot="course-card-art" className={`relative w-full ${isIntroduction ? 'aspect-[450.06/515.9]' : 'aspect-[580/570]'} ${isIntroduction || course.slug === 'llm-101' ? 'max-[721px]:w-[calc(100%_-_12px)]' : 'max-[721px]:absolute max-[721px]:top-1/2 max-[721px]:left-1/2 max-[721px]:h-[min(calc(100%_-_32px),150cqw)] max-[721px]:w-auto max-[721px]:-translate-x-1/2 max-[721px]:-translate-y-1/2'}`}>
            {isIntroduction && <MacExplode />}
            {course.slug === 'llm-101' && <ChipExplode callouts={false} />}
            {course.slug === 'coding-101' && <RocketExplode />}
            {course.slug === 'agent-101' && <ServoExplode />}
          </div>
        </div>}
      </CardContent>
    </Card>
  </Link>;
}
