/**
 * [INPUT]: Fumadocs MDX, next-intl, and reviewed config/redirects.json migrations.
 * [OUTPUT]: Validated Next.js configuration and security headers.
 * [POS]: Application build boundary; content policy lives in src/lib/content.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { createMDX } from 'fumadocs-mdx/next';
import createNextIntlPlugin from 'next-intl/plugin';
import redirects from './config/redirects.json' with { type: 'json' };

if (process.env.CONTENT_TEST === '1' && process.env.VERCEL) {
  throw new Error('Test content must never be deployed.');
}
if (process.env.VERCEL_ENV === 'production') {
  const url = new URL(process.env.SITE_URL || 'invalid');
  if (url.protocol !== 'https:' || /localhost|example\.|\.example$|^127\.|^0\.0\.0\.0$|\[::1\]/.test(url.hostname) || url.pathname !== '/' || url.username || url.password || url.search || url.hash) {
    throw new Error('Production requires a real HTTPS SITE_URL origin.');
  }
}
const withMDX = createMDX({ configPath: 'config/source.config.ts' });
const withIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');
export default withMDX(withIntl({
  allowedDevOrigins: ['192.168.0.107'],
  agentRules: false,
  turbopack: { root: process.cwd() },
  distDir: process.env.CONTENT_TEST === '1' ? '.next-test' : '.next',
  poweredByHeader: false,
  skipProxyUrlNormalize: true,
  async redirects() { return redirects.map((entry) => ({ ...entry, permanent: true })); },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: "object-src 'none'; frame-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
      ...(process.env.VERCEL_ENV !== 'production' ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : []),
    ] }];
  },
}));
