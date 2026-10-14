/**
 * [INPUT]: The validated public catalog.
 * [OUTPUT]: Actionable authoring errors and public coverage counts.
 * [POS]: Content quality gate used by check, build, and CI.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { readCatalog } from '../src/lib/content/manifest';
import { locales } from '../src/lib/i18n/config';
import redirects from '../config/redirects.json' with { type: 'json' };
import { validateRedirects } from '../src/lib/seo/redirects';
const catalog = readCatalog();
validateRedirects(redirects, new Set([...catalog.documents.map((doc) => doc.url), ...locales.flatMap((locale) => [`/${locale}`, `/${locale}/courses`, `/${locale}/about`])]));
for (const locale of locales) {
  const courses = catalog.courses.filter((course) => course.locale === locale);
  console.log(`${locale}: ${courses.length} courses, ${courses.reduce((count, course) => count + course.lessons.length, 0)} published lessons`);
}
for (const warning of catalog.warnings) console.warn(warning);
console.log(`Content validation passed (${catalog.version}).`);
