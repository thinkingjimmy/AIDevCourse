/**
 * [INPUT]: Shared locale configuration and next-intl routing.
 * [OUTPUT]: Prefix-only routing policy without automatic alternate links.
 * [POS]: Routing declaration; proxy owns only allowlisted entry negotiation.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { defineRouting } from 'next-intl/routing';
import { defaultLocale, locales } from './config';
export const routing = defineRouting({ locales, defaultLocale, localePrefix: 'always', alternateLinks: false });
export function isNegotiatedPath(path: string) {
  return path === '/' || path === '/about' || path === '/courses' || path.startsWith('/courses/');
}
