/**
 * [INPUT]: Five local dictionaries and the cross-language content catalog.
 * [OUTPUT]: ICU/key parity checks, coverage, and stale-translation reports.
 * [POS]: Internationalization quality gate; missing normal translations are not errors.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { readFileSync } from 'node:fs';
import { locales } from '../src/lib/i18n/config';
import { validateDictionaries } from '../src/lib/i18n/validate';
import { readCatalog } from '../src/lib/content/manifest';
const dictionaries = Object.fromEntries(locales.map((locale) => [locale, JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'))]));
const count = validateDictionaries(dictionaries);
const catalog = readCatalog();
for (const warning of catalog.warnings) console.warn(warning);
console.log(`${locales.length} dictionaries × ${count} valid messages; translation identities checked.`);
