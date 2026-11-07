import type { CourseManifest } from '@/lib/content/model';
import { DiskCover, type DiskLabels } from '@/components/home/disk';

export type DiskCourse = Pick<CourseManifest, 'id' | 'slug' | 'title' | 'description' | 'url' | 'level' | 'section'> & { lessonCount: number };

export function CourseDisk({ course, labels, heading = false }: { course: DiskCourse; labels: DiskLabels; heading?: boolean }) {
  const dots = course.section === 'introduction' ? 0 : { beginner: 1, intermediate: 2, advanced: 3 }[course.level];
  return <DiskCover id={course.id} title={course.title} titleId={heading ? `course-${course.slug}` : undefined}
    labels={labels} level={course.section ?? course.level} dots={dots} heading={heading} />;
}
