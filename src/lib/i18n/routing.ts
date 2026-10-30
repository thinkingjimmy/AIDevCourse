import { defaultLocale, isLocale, type Locale } from './config';

export function localePath(locale: Locale, path = '/') {
  return locale === defaultLocale ? path : `/${locale}${path === '/' ? '' : path}`;
}

export function pathLocale(path: string): Locale {
  const prefix = path.split('/')[1];
  return isLocale(prefix) ? prefix : defaultLocale;
}

export function stripLocale(path: string) {
  return isLocale(path.split('/')[1]) ? path.replace(/^\/[^/]+/, '') || '/' : path;
}

export function canonicalPath(path: string) { return localePath(pathLocale(path), stripLocale(path)); }

export function isNegotiatedPath(path: string) { return path === '/'; }
