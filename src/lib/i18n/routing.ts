import { defaultLocale, isLocale, type Locale } from './config';

export type HomeView = 'courses' | 'resources';

export function localePath(locale: Locale, path = '/') {
  return locale === defaultLocale ? path : `/${locale}${path === '/' ? '' : path}`;
}

export function homePath(locale: Locale, view: HomeView, page = 1) {
  const params = new URLSearchParams();
  if (view === 'resources') params.set('view', 'resources');
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return `${localePath(locale)}${query ? `?${query}` : ''}`;
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
