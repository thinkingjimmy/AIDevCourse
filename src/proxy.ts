/**
 * [INPUT]: Public route snapshot, allowlisted entries, and optional language preference.
 * [OUTPUT]: Private 307 negotiation and server-rendered 404 rewrites; public URLs pass unchanged.
 * [POS]: Sole routing interceptor; explicit language pages never negotiate content.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { isLocale, localeCookie, negotiateLocale } from './lib/i18n/config';
import { isNegotiatedPath } from './lib/i18n/routing';
import publicRoutes from '../.source/routes.json';
const paths = new Set(publicRoutes);
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!isNegotiatedPath(path)) {
    if (paths.has(path)) return NextResponse.next();
    const language = path.split('/')[1];
    const target = new URL(request.url);
    target.host = request.headers.get('host') ?? target.host;
    target.pathname = `/${isLocale(language) ? language : 'en'}/unavailable`;
    target.search = '';
    // Runtime notFound recovery in the pinned Next.js version otherwise sends an empty HTML shell.
    return NextResponse.rewrite(target, { status: 404 });
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
