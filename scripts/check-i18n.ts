import { readFileSync } from 'node:fs';
import { locales } from '../src/lib/i18n/config';
import { validateDictionaries } from '../src/lib/i18n/validate';
import { readCatalog } from '../src/lib/content/manifest';
const dictionaries = Object.fromEntries(locales.map((locale) => [locale, JSON.parse(readFileSync(`src/messages/${locale}.json`, 'utf8'))]));
const count = validateDictionaries(dictionaries);
readCatalog();
console.log(`${locales.length} dictionaries × ${count} valid messages; translation identities checked.`);
