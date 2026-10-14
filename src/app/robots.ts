/**
 * [INPUT]: Explicit production indexing status and the configured origin.
 * [OUTPUT]: Robots policy, production sitemap location, and noindex for /design previews.
 * [POS]: Preview indexing protection; publication filtering is enforced separately.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { MetadataRoute } from 'next';
import { site } from '@/lib/site-config';
export default function robots(): MetadataRoute.Robots {
  return site.indexable ? { rules: { userAgent: '*', allow: '/', disallow: '/design' }, sitemap: `${site.origin}/sitemap.xml` } : { rules: { userAgent: '*', disallow: '/' } };
}
