import Link from 'next/link';
import { useId, type ComponentProps, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { blogCourseId, site } from '@/lib/site-config';
import '@/styles/macintosh/media-cards.css';

export type DiskLabels = { level: string; status?: string; stamp?: string };
export type GalleryItem = {
  id: string; slug: string; title: string; description: string; url: string;
  kind: 'course' | 'resource'; group: string; dots: number; labels: DiskLabels;
};
export const opticalDiscArtwork = '/images/home/discs/labels.avif';
const variants = ['ivory', 'forest', 'index', 'smoke', 'cobalt', 'amber', 'plum', 'brick'] as const;
const materials = new Map<string, typeof variants[number]>([
  ['ai-coding', 'ivory'], ['llm-101', 'forest'], ['coding-101', 'smoke'],
  ['design-101', 'index'], ['agent-101', 'cobalt'], ['vocabulary', 'amber'], ['animation-vocabulary', 'plum'],
  ['programming-vocabulary', 'brick'],
]);
const discPrints = new Map([
  [blogCourseId, ['0% 0%', '#422436']],
  ['vocabulary', ['100% 0%', '#173d38']],
  ['animation-vocabulary', ['0% 100%', '#262855']],
  ['programming-vocabulary', ['100% 100%', '#103846']],
]);
export function diskMaterial({ id }: { id: string }): CSSProperties {
  const seed = Array.from(id).reduce((sum, character) => sum + character.codePointAt(0)!, 0);
  const variant = materials.get(id) ?? variants[seed % variants.length];
  return { '--disk-artwork': `url("/images/home/disks/${variant}.svg")` } as CSSProperties;
}
export function DiskCover({ id, title, titleId, labels, level, dots, stampId, heading = false }: {
  id: string; title: string; titleId?: string; labels: DiskLabels; level: string; dots: number; stampId?: string; heading?: boolean;
}) {
  const Title = heading ? 'h3' : 'span';
  return <div className="course-disk" data-slot="course-disk" style={diskMaterial({ id })}>
    <div className="disk-label">
      <div className="disk-label-header">
        <span className="disk-brand" aria-hidden>{site.name}</span>
        {labels.stamp && <span id={stampId} className="disk-update-stamp" data-slot="course-update-stamp">{labels.stamp}</span>}
      </div>
      <Title id={titleId} className="disk-title">{title}</Title>
      <span className="disk-meta"><span className="disk-level" data-level={level}>
        <span className="disk-dots" aria-hidden>{Array.from({ length: dots }, (_, index) => <i key={index} />)}</span>{labels.level}
      </span>{labels.status && <span>{labels.status}</span>}</span>
    </div>
  </div>;
}
export function OpticalDiscCover({ id, title, titleId }: { id: string; title: string; titleId?: string }) {
  const [position, color] = discPrints.get(id) ?? [];
  const style = {
    '--disc-print': position ? `${color} url("${opticalDiscArtwork}") ${position} / 200% 200% no-repeat` : undefined,
    '--disc-print-color': color ?? '#103846',
  } as CSSProperties;
  const Title = titleId ? 'h3' : 'span';
  return <div className="optical-disc" data-slot="optical-disc" style={style}>
    <div className="optical-disc-surface">
      <div className="optical-disc-print">
        <div className="optical-disc-label">
          <Title id={titleId} className="optical-disc-title">{title}</Title>
          <span className="optical-disc-brand" aria-hidden>{site.name}</span>
        </div>
      </div>
    </div>
  </div>;
}

export function DiskLink({ item, showDiscCount, className, ...props }: {
  item: GalleryItem; showDiscCount?: boolean;
} & Omit<ComponentProps<typeof Link>, 'href' | 'children'>) {
  const id = useId();
  const optical = item.kind === 'resource';
  const titleId = `${id}-${item.kind}-${item.slug}`;
  const descriptionId = `${id}-description-${item.slug}`;
  const stampId = !optical && item.labels.stamp ? `${id}-update-${item.slug}` : undefined;
  return <Link {...props} href={item.url} aria-labelledby={titleId}
    aria-describedby={stampId ? `${descriptionId} ${stampId}` : descriptionId}
    data-course-disk={optical ? undefined : item.id} data-resource-disk={optical ? item.id : undefined}
    className={cn(optical ? 'optical-disc-link' : 'course-disk-link', className)}>
    {optical ? <>
      <OpticalDiscCover id={item.id} title={item.title} titleId={titleId} />
      {showDiscCount && <span className="optical-disc-meta">{item.labels.status}</span>}
    </>
      : <DiskCover id={item.id} title={item.title} titleId={titleId} labels={item.labels} level={item.group} dots={item.dots} stampId={stampId} heading />}
    <span className="sr-only" id={descriptionId}>{item.description}</span>
  </Link>;
}
