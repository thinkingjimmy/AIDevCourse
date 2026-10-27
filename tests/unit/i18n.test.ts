/**
 * [INPUT]: Locale negotiation rules and real five-language dictionaries.
 * [OUTPUT]: Routing priority, allowlist, and ICU parity regression coverage.
 * [POS]: Internationalization policy tests independent of framework middleware.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { locales, negotiateLocale, isLocale, htmlLanguages } from '../../src/lib/i18n/config';
import { isNegotiatedPath } from '../../src/lib/i18n/routing';
import { validateDictionaries } from '../../src/lib/i18n/validate';
it('matches weighted browser preferences only after a valid preference cookie', () => {
  expect(negotiateLocale('es', 'fr;q=1,ja;q=.8')).toBe('es');
  expect(negotiateLocale('evil', 'de,ja-JP;q=.9,en;q=.5')).toBe('ja');
  expect(negotiateLocale(undefined, 'en;q=0,fr;q=.2,es;q=.8')).toBe('es');
  expect(negotiateLocale(undefined, 'zh-Hant,fr;q=.5')).toBe('zh');
  expect(negotiateLocale(undefined, 'de,xx;q=1')).toBe('en');
  expect(htmlLanguages.zh).toBe('zh-Hans');
});
it('does not negotiate explicit prefixes, arbitrary paths, assets, or API routes', () => {
  for (const path of ['/en', '/fr/courses/one', '/de/courses', '/unknown', '/api/search/zh', '/images/example.svg', '/_next/foo', '/sitemap.xml', '/courses', '/courses/course/lesson', '/about']) expect(isNegotiatedPath(path)).toBe(false);
  expect(isNegotiatedPath('/')).toBe(true);
  for (const lang of ['../en', 'cn', 'jp', 'EN', 'en/../../']) expect(isLocale(lang)).toBe(false);
});
it('checks every real message and detects key, ICU, and parameter regressions', () => {
  const dictionaries = Object.fromEntries(locales.map((lang) => [lang, JSON.parse(readFileSync(`src/messages/${lang}.json`, 'utf8'))]));
  expect(validateDictionaries(dictionaries)).toBeGreaterThan(80);
  expect(() => validateDictionaries({ en: { key: '{count} lessons' }, fr: {} })).toThrow('key mismatch');
  expect(() => validateDictionaries({ en: { key: '{count} lessons' }, fr: { key: '{number} leçons' } })).toThrow('parameter mismatch');
  expect(() => validateDictionaries({ en: { key: '{count} lessons' }, fr: { key: '{count' } })).toThrow('invalid ICU');
  expect(() => validateDictionaries({ en: { key: 'Hello' }, fr: { key: '' } })).toThrow('empty');
});
