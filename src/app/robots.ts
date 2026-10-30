import type { MetadataRoute } from 'next';
import { site } from '@/lib/site-config';
export default function robots(): MetadataRoute.Robots {
  return site.indexable ? { rules: { userAgent: '*', allow: '/', disallow: '/design' }, sitemap: `${site.origin}/sitemap.xml` } : { rules: { userAgent: '*', disallow: '/' } };
}
