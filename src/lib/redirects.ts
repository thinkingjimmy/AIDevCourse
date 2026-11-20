import { isLocale } from './i18n/config';
import { blogSlug } from './i18n/routing';
export type RedirectEntry = { source: string; destination: string };
export function validateRedirects(entries: RedirectEntry[], publicUrls: Set<string>) {
  const sources = new Set<string>();
  const destinationPaths = new Set<string>();
  for (const { source, destination } of entries) {
    const destinationPath = typeof destination === 'string' ? destination.split('?', 1)[0] : '';
    for (const path of [source, destinationPath]) {
      if (typeof path !== 'string' || path !== '/' && !/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(path)) throw new Error('Redirects require exact supported-language paths');
      const root = path.split('/')[1];
      if (root && !isLocale(root) && !['about', 'courses', blogSlug, 'unavailable'].includes(root)) throw new Error('Redirects require exact supported-language paths');
    }
    if (sources.has(source) || publicUrls.has(source)) throw new Error(`Duplicate or still-published redirect source: ${source}`);
    if (!publicUrls.has(destination) || source === destinationPath) throw new Error(`Redirect target must be public: ${destination}`);
    sources.add(source);
    destinationPaths.add(destinationPath);
  }
  if ([...destinationPaths].some(path => sources.has(path))) throw new Error('Redirect chains and cycles are not supported');
  return entries;
}
