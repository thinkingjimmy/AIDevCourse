import { createMDX } from 'fumadocs-mdx/next';
import createNextIntlPlugin from 'next-intl/plugin';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { contentMode, redirects } from './config/content-mode.mjs';
import { resolveSiteEnvironment } from './config/site-environment.mjs';

const environment = resolveSiteEnvironment();
const development = process.env.NODE_ENV === 'development';
const developmentOrigins = development ? Object.values(networkInterfaces()).flatMap(addresses =>
  addresses?.filter(address => address.family === 'IPv4' && !address.internal).map(address => address.address) ?? []) : [];
const withMDX = createMDX({ configPath: 'config/source.config.ts', outDir: contentMode.generated });
const withIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');
const aliases = {
  '@source': `./${contentMode.generated}/${development ? 'dynamic' : 'server'}.ts`,
  '@catalog': `./${contentMode.generated}/catalog.json`,
  '@routes': `./${contentMode.generated}/routes.json`,
  '@catalog-reader': `./src/lib/content/source/${development ? 'development' : 'production'}.ts`,
};
export default withMDX(withIntl({
  agentRules: false,
  allowedDevOrigins: ['127.0.0.1', ...developmentOrigins],
  // Reuse Node.js compiler plugins instead of bundling a second compiler for development.
  serverExternalPackages: development ? ['fumadocs-mdx/runtime/dynamic', 'fumadocs-core/mdx-plugins'] : [],
  // Persist compiler work, then release its in-memory copies during development.
  experimental: development ? { turbopackMemoryEviction: 'full', turbopackGc: true } : {},
  turbopack: { root: process.cwd(), resolveAlias: aliases },
  webpack(config) {
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
      { key: 'Content-Security-Policy', value: "object-src 'none'; frame-src https://www.youtube-nocookie.com https://platform.twitter.com https://syndication.twitter.com https://platform.x.com https://syndication.x.com; base-uri 'self'; frame-ancestors 'none'" },
      ...(!environment.indexable ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : []),
    ] }];
  },
}));
