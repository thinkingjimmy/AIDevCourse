/**
 * [INPUT]: Active content mode's route snapshot, allowlisted entries, and language preference.
 * [OUTPUT]: Private 307 negotiation, and HTTP 404 responses whose body is the rendered unavailable document.
 * [POS]: Sole routing interceptor; explicit language pages never negotiate content.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { isLocale, localeCookie, negotiateLocale } from './lib/i18n/config';
import { isNegotiatedPath } from './lib/i18n/routing';
import publicRoutes from '@routes';
const paths = new Set(publicRoutes);
const forwarded = ['accept', 'rsc', 'next-router-prefetch', 'next-router-segment-prefetch', 'next-router-state-tree', 'next-url'];
const preserved = ['content-type', 'content-security-policy', 'x-content-type-options', 'referrer-policy', 'x-frame-options', 'permissions-policy', 'x-robots-tag'];
function isUnavailableDocument(pathname: string) {
  if (pathname === '/unavailable') return true;
  const language = pathname.split('/')[1] ?? '';
  return isLocale(language) && pathname === `/${language}/unavailable`;
}
function unavailablePath(pathname: string) {
  const language = pathname.split('/')[1] ?? '';
  return isLocale(language) ? `/${language}/unavailable` : '/unavailable';
}
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!isNegotiatedPath(path)) {
    if (paths.has(path) || isUnavailableDocument(path)) return NextResponse.next();
    const target = new URL(unavailablePath(path), request.url);
    target.search = '';
    const headers = new Headers();
    for (const name of forwarded) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    // A rewrite status is discarded, and notFound() renders an empty shell. Return the static document ourselves.
    const rendered = await fetch(target, { headers, redirect: 'manual' });
    const responseHeaders = new Headers();
    for (const name of preserved) {
      const value = rendered.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    if (!responseHeaders.has('x-robots-tag')) responseHeaders.set('x-robots-tag', 'noindex, nofollow');
    responseHeaders.set('cache-control', 'private, no-store');
    return new NextResponse(rendered.body, { status: 404, headers: responseHeaders });
  }
  const locale = negotiateLocale(request.cookies.get(localeCookie)?.value, request.headers.get('accept-language') ?? '');
  const target = request.nextUrl.clone();
  target.pathname = `/${locale}${target.pathname === '/' ? '' : target.pathname}`;
  const response = NextResponse.redirect(target, 307);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie, Accept-Language');
  return response;
}
export const config = { matcher: ['/((?!api(?:/|$)|_next(?:/|$)|images(?:/|$)|favicon.svg$|robots.txt$|sitemap.xml$).*)'] };
