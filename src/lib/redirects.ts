/**
 * [INPUT]: Explicit URL history entries and the final public URL set.
 * [OUTPUT]: Validated one-hop redirects with existing public targets.
 * [POS]: Authoring URL migration contract; stable lesson IDs preserve progress separately.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { isLocale } from './i18n/config';
export type RedirectEntry = { source: string; destination: string };
export function validateRedirects(entries: RedirectEntry[], publicUrls: Set<string>) {
  const sources = new Set<string>();
  for (const entry of entries) {
    for (const path of [entry.source, entry.destination]) {
      if (typeof path !== 'string' || !/^\/[a-z]{2}(?:\/[a-z0-9-]+)*$/.test(path) || !isLocale(path.split('/')[1])) throw new Error('Redirects require exact supported-language paths');
    }
    if (sources.has(entry.source) || publicUrls.has(entry.source)) throw new Error(`Duplicate or still-published redirect source: ${entry.source}`);
    if (!publicUrls.has(entry.destination) || entry.source === entry.destination) throw new Error(`Redirect target must be public: ${entry.destination}`);
    sources.add(entry.source);
  }
  if (entries.some((entry) => sources.has(entry.destination))) throw new Error('Redirect chains and cycles are not supported');
  return entries;
}
