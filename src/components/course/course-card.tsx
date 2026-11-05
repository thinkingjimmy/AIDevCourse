import Link from 'next/link';
import type { ComponentProps, CSSProperties } from 'react';
import type { CourseManifest } from '@/lib/content/model';
import { cn } from '@/lib/utils';
import { site } from '@/lib/site-config';

export type DiskCourse = Pick<CourseManifest, 'id' | 'slug' | 'title' | 'description' | 'url' | 'level' | 'section'> & { lessonCount: number };
export type DiskLabels = { level: string; status: string };
const variants = ['ivory', 'forest', 'index', 'smoke'] as const;
const materials = new Map<string, typeof variants[number]>([
  ['ai-coding', 'ivory'], ['llm-101', 'forest'], ['coding-101', 'smoke'],
  ['design-101', 'index'], ['agent-101', 'forest'],
]);
export function diskMaterial(course: Pick<DiskCourse, 'id'>): CSSProperties {
  const seed = Array.from(course.id).reduce((sum, character) => sum + character.codePointAt(0)!, 0);
  const variant = materials.get(course.id) ?? variants[seed % variants.length];
  return { '--disk-artwork': `url("/images/home/disks/${variant}.svg")` } as CSSProperties;
}
export function CourseDisk({ course, labels, heading = false }: { course: DiskCourse; labels: DiskLabels; heading?: boolean }) {
  const Title = heading ? 'h3' : 'span';
  const dots = course.section === 'introduction' ? 0 : { beginner: 1, intermediate: 2, advanced: 3 }[course.level];
  return <div className="course-disk" data-slot="course-disk" style={diskMaterial(course)}>
    <div className="disk-label">
      <span className="disk-brand" aria-hidden>{site.name}</span>
      <Title id={heading ? `course-${course.slug}` : undefined} className="disk-title">{course.title}</Title>
      <span className="disk-meta"><span className="disk-level" data-level={course.section ?? course.level}>
        <span className="disk-dots" aria-hidden>{Array.from({ length: dots }, (_, index) => <i key={index} />)}</span>{labels.level}
      </span><span>{labels.status}</span></span>
    </div>
  </div>;
}
export function CourseCard({ course, labels, className, ...props }: {
  course: DiskCourse; labels: DiskLabels;
} & Omit<ComponentProps<typeof Link>, 'href' | 'children'>) {
  return <Link {...props} href={course.url} aria-labelledby={`course-${course.slug}`} aria-describedby={`description-${course.slug}`}
    data-course-disk={course.id} className={cn('course-disk-link', className)}>
    <CourseDisk course={course} labels={labels} heading />
    <span className="sr-only" id={`description-${course.slug}`}>{course.description}</span>
  </Link>;
}
