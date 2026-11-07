import Link from 'next/link';
import { useId, type ComponentProps, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { site } from '@/lib/site-config';

export type DiskLabels = { level: string; status: string };
export type GalleryItem = {
  id: string; slug: string; title: string; description: string; url: string;
  kind: 'course' | 'resource'; group: string; dots: number; labels: DiskLabels;
};
const variants = ['ivory', 'forest', 'index', 'smoke', 'cobalt', 'amber', 'plum', 'brick'] as const;
const materials = new Map<string, typeof variants[number]>([
  ['ai-coding', 'ivory'], ['llm-101', 'forest'], ['coding-101', 'smoke'],
  ['design-101', 'index'], ['agent-101', 'cobalt'], ['vocabulary', 'amber'], ['animation-vocabulary', 'plum'],
]);
export function diskMaterial(item: { id: string }): CSSProperties {
  const seed = Array.from(item.id).reduce((sum, character) => sum + character.codePointAt(0)!, 0);
  const variant = materials.get(item.id) ?? variants[seed % variants.length];
  return { '--disk-artwork': `url("/images/home/disks/${variant}.svg")` } as CSSProperties;
}
export function DiskCover({ id, title, titleId, labels, level, dots, heading = false }: {
  id: string; title: string; titleId?: string; labels: DiskLabels; level: string; dots: number; heading?: boolean;
}) {
  const Title = heading ? 'h3' : 'span';
  return <div className="course-disk" data-slot="course-disk" style={diskMaterial({ id })}>
    <div className="disk-label">
      <span className="disk-brand" aria-hidden>{site.name}</span>
      <Title id={titleId} className="disk-title">{title}</Title>
      <span className="disk-meta"><span className="disk-level" data-level={level}>
        <span className="disk-dots" aria-hidden>{Array.from({ length: dots }, (_, index) => <i key={index} />)}</span>{labels.level}
      </span><span>{labels.status}</span></span>
    </div>
  </div>;
}
export function DiskLink({ item, className, ...props }: { item: GalleryItem } & Omit<ComponentProps<typeof Link>, 'href' | 'children'>) {
  const id = useId();
  const titleId = `${id}-${item.kind}-${item.slug}`;
  const descriptionId = `${id}-description-${item.slug}`;
  return <Link {...props} href={item.url} aria-labelledby={titleId} aria-describedby={descriptionId}
    data-course-disk={item.kind === 'course' ? item.id : undefined} data-resource-disk={item.kind === 'resource' ? item.id : undefined}
    className={cn('course-disk-link', className)}>
    <DiskCover id={item.id} title={item.title} titleId={titleId} labels={item.labels} level={item.group} dots={item.dots} heading />
    <span className="sr-only" id={descriptionId}>{item.description}</span>
  </Link>;
}
