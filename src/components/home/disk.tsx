import Link from 'next/link';
import { useId, type ComponentProps, type CSSProperties } from 'react';
import type { LessonSummary } from '@/lib/content/model';
import { cn } from '@/lib/utils';
import { blogCourseId, site } from '@/lib/site-config';
import '@/styles/macintosh/media-cards.css';

export type DiskLabels = { level: string; status?: string; stamp?: string };
export type GalleryItem = {
  id: string; slug: string; title: string; description: string; url: string;
  kind: 'course' | 'dictionary' | 'resource'; group: string; dots: number; labels: DiskLabels;
};
export type BlogArticle = Pick<LessonSummary, 'id' | 'title' | 'description' | 'url'>;
type DiskLinkProps = Omit<ComponentProps<typeof Link>, 'href' | 'children'>;
export const opticalDiscArtwork = '/images/home/discs/labels.avif';
const gameCaseArtwork = '/images/home/discs/game-case.svg';
const variants = ['ivory', 'forest', 'index', 'smoke', 'cobalt', 'amber', 'plum', 'brick'] as const;
const materials = new Map<string, typeof variants[number]>([
  ['ai-coding', 'ivory'], ['llm-101', 'forest'], ['coding-101', 'smoke'],
  ['design-101', 'index'], ['agent-101', 'cobalt'], ['vocabulary', 'amber'], ['animation-vocabulary', 'plum'],
  ['programming-vocabulary', 'brick'],
]);
const discPrints = new Map([
  [blogCourseId, ['0% 0%', '#422436']],
  ['enterprise-ai-adoption-roi', ['0% 0%', '#422436']],
  ['no-loyalty-to-ai-coding-tools', ['100% 100%', '#103846']],
  ['ai-era-saas', ['100% 0%', '#24473f']],
  ['gpt-6-2-vs-opus-5-5', ['0% 100%', '#30245d']],
]);
function opticalDiscPrint(id: string) {
  const [position, color] = discPrints.get(id) ?? [];
  return {
    '--disc-print': position ? `${color} url("${opticalDiscArtwork}") ${position} / 200% 200% no-repeat` : undefined,
    '--disc-print-color': color ?? '#103846',
  } as CSSProperties;
}
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
function OpticalDiscCover({ id, title, titleId }: { id: string; title?: string; titleId?: string }) {
  const Title = titleId ? 'h3' : 'span';
  return <div className="optical-disc" data-slot="optical-disc" style={opticalDiscPrint(id)} aria-hidden={title ? undefined : true}>
    <div className="optical-disc-surface">
      <div className="optical-disc-print">
        {title && <div className="optical-disc-label">
          <Title id={titleId} className="optical-disc-title">{title}</Title>
          <span className="optical-disc-brand" aria-hidden>{site.name}</span>
        </div>}
      </div>
    </div>
  </div>;
}

function GameCasePanel({ panel, className }: { panel: 'front' | 'inside' | 'tray'; className?: string }) {
  return <svg className={cn('ps2-case-panel', className)} viewBox="0 0 108 152" width="108" height="152" focusable="false">
    <use href={`${gameCaseArtwork}#${panel}`} />
  </svg>;
}

function PlayStationCase({ id }: { id: string }) {
  return <div className="ps2-case" data-slot="ps2-case" aria-hidden>
    <GameCasePanel panel="tray" className="ps2-case-base" />
    <OpticalDiscCover id={id} />
    <div className="ps2-case-lid" data-slot="ps2-case-lid">
      <div className="ps2-case-front">
        <GameCasePanel panel="front" />
        <span className="ps2-case-art" style={opticalDiscPrint(id)} />
      </div>
      <GameCasePanel panel="inside" className="ps2-case-inside" />
    </div>
  </div>;
}

export function DiskLink({ item, showDictionaryCount, className, ...props }: {
  item: GalleryItem; showDictionaryCount?: boolean;
} & DiskLinkProps) {
  const id = useId();
  const optical = item.kind === 'resource';
  const status = item.kind === 'course' || showDictionaryCount ? item.labels.status : undefined;
  const titleId = `${id}-${item.kind}-${item.slug}`;
  const descriptionId = `${id}-description-${item.slug}`;
  const stampId = !optical && item.labels.stamp ? `${id}-update-${item.slug}` : undefined;
  return <Link {...props} href={item.url} aria-labelledby={titleId}
    aria-describedby={stampId ? `${descriptionId} ${stampId}` : descriptionId}
    data-course-disk={item.kind === 'course' ? item.id : undefined}
    data-dictionary-disk={item.kind === 'dictionary' ? item.id : undefined}
    data-resource-disk={optical ? item.id : undefined}
    className={cn(optical ? 'optical-disc-link' : 'course-disk-link', className)}>
    {optical ? <OpticalDiscCover id={item.id} title={item.title} titleId={titleId} />
      : <DiskCover id={item.id} title={item.title} titleId={titleId} labels={{ ...item.labels, status }} level={item.group} dots={item.dots} stampId={stampId} heading />}
    <span className="sr-only" id={descriptionId}>{item.description}</span>
  </Link>;
}

export function BlogArticleLink({ article, ...props }: { article: BlogArticle } & DiskLinkProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  return <Link {...props} href={article.url} className="blog-article-link" data-blog-article={article.id}
    aria-labelledby={titleId} aria-describedby={descriptionId}>
    <PlayStationCase id={article.id} />
    <div>
      <h3 id={titleId}>{article.title}</h3>
      <p id={descriptionId}>{article.description}</p>
    </div>
  </Link>;
}
