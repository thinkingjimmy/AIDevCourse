import { localePath } from '../src/lib/i18n/routing';
import { readCatalog } from '../src/lib/content/manifest';
import { locales } from '../src/lib/i18n/config';
import { redirects } from '../config/content-mode.mjs';
import { validateRedirects } from '../src/lib/redirects';
const catalog = readCatalog();
validateRedirects(redirects, new Set(['/unavailable', ...catalog.documents.map((doc) => doc.url), ...locales.flatMap((locale) => [localePath(locale), localePath(locale, '/about'), localePath(locale, '/unavailable')])]));
for (const locale of locales) {
  const courses = catalog.courses.filter((course) => course.locale === locale);
  console.log(`${locale}: ${courses.length} courses, ${courses.reduce((count, course) => count + course.lessons.length, 0)} published lessons`);
}
console.log(`Content validation passed (${catalog.version}).`);
