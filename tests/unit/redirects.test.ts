/**
 * [INPUT]: Explicit route migrations and a public URL allowlist.
 * [OUTPUT]: Invalid destination, collision, and unsafe redirect regression coverage.
 * [POS]: URL migration safety tests.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { it, expect } from 'vitest';
import { validateRedirects } from '../../src/lib/seo/redirects';
it('accepts only exact one-hop migrations to published content', () => {
  const urls = new Set(['/zh/courses/new']);
  expect(validateRedirects([{ source: '/zh/courses/old', destination: '/zh/courses/new' }], urls)).toHaveLength(1);
  expect(() => validateRedirects([{ source: '/de/old', destination: '/zh/courses/new' }], urls)).toThrow('supported-language');
  expect(() => validateRedirects([{ source: '/zh/old', destination: 'https://example.com' }], urls)).toThrow();
  expect(() => validateRedirects([{ source: '/zh/old', destination: '/zh/draft' }], urls)).toThrow('public');
  expect(() => validateRedirects([{ source: '/zh/courses/new', destination: '/zh/courses/new' }], urls)).toThrow('still-published');
});
