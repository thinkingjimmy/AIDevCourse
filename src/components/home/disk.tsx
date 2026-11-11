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
  ['programming-vocabulary', 'brick'],
]);
const discPrints = new Map([
  ['musings', ['0% 0%', '#422436']],
  ['vocabulary', ['100% 0%', '#173d38']],
  ['animation-vocabulary', ['0% 100%', '#262855']],
  ['programming-vocabulary', ['100% 100%', '#103846']],
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
function OpticalDiscCover({ item, titleId }: { item: GalleryItem; titleId: string }) {
  const [position, color] = discPrints.get(item.id) ?? ['100% 100%', '#103846'];
  const style = { '--disc-print-position': position, '--disc-print-color': color } as CSSProperties;
  return <>
    <div className="optical-disc" data-slot="optical-disc" style={style}>
      <div className="optical-disc-surface">
        <div className="optical-disc-print">
          <div className="optical-disc-label">
            <h3 id={titleId} className="optical-disc-title">{item.title}</h3>
            <span className="optical-disc-brand" aria-hidden>{site.name}</span>
          </div>
        </div>
      </div>
    </div>
    <span className="optical-disc-meta">{item.labels.status}</span>
  </>;
}

export function DiskLink({ item, optical = false, className, ...props }: {
  item: GalleryItem; optical?: boolean;
} & Omit<ComponentProps<typeof Link>, 'href' | 'children'>) {
  const id = useId();
  const titleId = `${id}-${item.kind}-${item.slug}`;
  const descriptionId = `${id}-description-${item.slug}`;
  return <Link {...props} href={item.url} aria-labelledby={titleId} aria-describedby={descriptionId}
    data-course-disk={item.kind === 'course' ? item.id : undefined} data-resource-disk={item.kind === 'resource' ? item.id : undefined}
    className={cn(optical ? 'optical-disc-link' : 'course-disk-link', className)}>
    {optical ? <OpticalDiscCover item={item} titleId={titleId} />
      : <DiskCover id={item.id} title={item.title} titleId={titleId} labels={item.labels} level={item.group} dots={item.dots} heading />}
    <span className="sr-only" id={descriptionId}>{item.description}</span>
  </Link>;
}
