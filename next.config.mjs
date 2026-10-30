import { createMDX } from 'fumadocs-mdx/next';
import createNextIntlPlugin from 'next-intl/plugin';
import redirects from './config/redirects.json' with { type: 'json' };
import { resolve } from 'node:path';
import { contentMode } from './config/content-mode.mjs';

if (process.env.VERCEL_ENV === 'production') {
  const url = new URL(process.env.SITE_URL || 'invalid');
  if (url.protocol !== 'https:' || /localhost|example\.|\.example$|^127\.|^0\.0\.0\.0$|\[::1\]/.test(url.hostname) || url.pathname !== '/' || url.username || url.password || url.search || url.hash) {
    throw new Error('Production requires a real HTTPS SITE_URL origin.');
  }
}
const withMDX = createMDX({ configPath: 'config/source.config.ts', outDir: contentMode.generated });
const withIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');
const aliases = {
  '@source': `./${contentMode.generated}/server.ts`,
  '@catalog': `./${contentMode.generated}/catalog.json`,
  '@routes': `./${contentMode.generated}/routes.json`,
};
export default withMDX(withIntl({
  agentRules: false,
  turbopack: { root: process.cwd(), resolveAlias: aliases },
  webpack(config, { dev }) {
    // Dynamic imports in MDX and i18n dependencies cannot be traced by the filesystem cache.
    if (dev) config.cache = { type: 'memory' };
    config.resolve.alias = { ...config.resolve.alias, ...Object.fromEntries(Object.entries(aliases).map(([key, path]) => [key, resolve(path)])) };
    return config;
  },
  distDir: contentMode.build,
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
