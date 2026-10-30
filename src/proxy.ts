import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, isLocale, localeCookie, negotiateLocale } from './lib/i18n/config';
import { isNegotiatedPath, localePath, pathLocale, stripLocale } from './lib/i18n/routing';
import publicRoutes from '@routes';
const paths = new Set(publicRoutes);
const forwarded = ['accept', 'rsc', 'next-router-prefetch', 'next-router-segment-prefetch', 'next-router-state-tree', 'next-url'];
const preserved = ['content-type', 'content-security-policy', 'x-content-type-options', 'referrer-policy', 'x-frame-options', 'permissions-policy', 'x-robots-tag'];
function unavailablePath(pathname: string) {
  return localePath(pathLocale(pathname), '/unavailable');
}
export async function proxy(request: NextRequest) {
  // Preserve the request origin; NextURL normalizes loopback hosts and can turn an internal rewrite into an external request.
  const path = request.nextUrl.pathname;
  if (path === '/en' || path.startsWith('/en/')) {
    const target = new URL(request.url);
    target.pathname = stripLocale(path);
    return NextResponse.redirect(target, 308);
  }
  if (isNegotiatedPath(path)) {
    const choice = request.nextUrl.searchParams.get('lang');
    const locale = isLocale(choice) ? choice : negotiateLocale(request.cookies.get(localeCookie)?.value, request.headers.get('accept-language') ?? '');
    const target = new URL(request.url);
    target.searchParams.delete('lang');
    target.pathname = locale === defaultLocale ? '/en' : localePath(locale);
    const response = locale === defaultLocale ? NextResponse.rewrite(target) : NextResponse.redirect(target, 307);
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Vary', 'Cookie, Accept-Language');
    if (isLocale(choice)) response.cookies.set(localeCookie, choice, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    return response;
  }
  if (!paths.has(path)) {
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
  if (pathLocale(path) === defaultLocale && (path === '/about' || path.startsWith('/courses/'))) {
    const target = new URL(request.url);
    target.pathname = `/en${path}`;
    return NextResponse.rewrite(target);
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!api(?:/|$)|_next(?:/|$)|images(?:/|$)|favicon.svg$|robots.txt$|sitemap.xml$).*)'] };
