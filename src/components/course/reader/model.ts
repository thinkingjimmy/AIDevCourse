import type { ReactNode } from 'react';

export type ReadingTarget = { url: string; title: string };
export type ReadingPane = ReadingTarget & { content: ReactNode };
export type ReadingSearch = Record<string, string | string[] | undefined>;

export function readingPaths(value: string | string[] | undefined, source: string, targets: readonly ReadingTarget[]) {
  const known = new Set(targets.map(target => target.url));
  const paths = new Map<string, string>();
  for (const href of (Array.isArray(value) ? value : value ? [value] : [])) {
    const path = href.split('#')[0];
    if (path !== source && known.has(path)) { paths.delete(path); paths.set(path, href); }
  }
  return [...paths.values()].slice(-1);
}

export function readingPrefix(path: string) {
  return `reading-${path.replace(/[^a-z0-9-]/gi, '-')}-`;
}
