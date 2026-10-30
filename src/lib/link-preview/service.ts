import 'server-only';
import { unstable_cache } from 'next/cache';
import catalog from '@catalog';
import { site } from '../site-config';
import { fetchRemotePreview } from './remote';
import type { LinkPreviewData } from './model';

function normalize(href: string) {
  const url = new URL(href, site.origin);
  url.hash = '';
  return url;
}

const allowed = new Set(catalog.documents.flatMap((document) => document.links
  .filter((link) => !link.image && /^https:\/\//i.test(link.url))
  .map((link) => normalize(link.url).href)));
const remotePreview = unstable_cache(fetchRemotePreview, ['link-preview-v1'], { revalidate: 3600 });

export async function getLinkPreview(href: string): Promise<LinkPreviewData | null | undefined> {
  let url: URL;
  try { url = normalize(href); } catch { return undefined; }
  if (url.origin === new URL(site.origin).origin) {
    const document = catalog.documents.find((document) => document.url === url.pathname);
    return document ? { title: document.data.title, description: document.data.description } : undefined;
  }
  if (!allowed.has(url.href)) return undefined;
  try { return await remotePreview(url.href); }
  catch { return null; }
}
