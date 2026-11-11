import type { SVGProps } from 'react';

const paths = {
  home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',
  heart: 'M12 21 3.5 12.5C-2 6 6 0 12 7c6-7 14-1 8.5 5.5Z',
  bookmark: 'M6 3h12v18l-6-4-6 4Z',
  star: 'M12 3 14.8 8.7 21 9.6 16.5 14 17.6 20.2 12 17.3 6.4 20.2 7.5 14 3 9.6 9.2 8.7Z',
  search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6',
  folder: 'M3 6h7l2 3h9v11H3Z',
  plus: 'M5 12h14M12 5v14',
  play: 'M6 4 18 12 6 20Z',
  save: 'M3 3h14l4 4v14H3ZM7 3v6h9V3M7 21v-8h10v8',
  phone: 'm8 3 3 5-3 3a14 14 0 0 0 5 5l3-3 5 3v4C11 24 0 13 4 3Z',
} as const;

export type GlyphName = keyof typeof paths;

export function IconGlyph({ name, size = 24, weight = 1.5, cap = 'round', filled = false, fixedWeight = false, pathTransform, ...props }: {
  name: GlyphName; size?: number; weight?: number; cap?: 'round' | 'square'; filled?: boolean; fixedWeight?: boolean; pathTransform?: string;
} & SVGProps<SVGSVGElement>) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
    stroke={filled ? 'none' : 'currentColor'} strokeWidth={weight} strokeLinecap={cap} strokeLinejoin="round"
    aria-hidden="true" data-glyph={name} data-filled={filled} {...props}>
    <path d={paths[name]} transform={pathTransform} vectorEffect={fixedWeight ? 'non-scaling-stroke' : undefined} />
  </svg>;
}
