/**
 * [INPUT]: An incoming request pathname.
 * [OUTPUT]: Explicit entry paths eligible for language negotiation.
 * [POS]: Routing declaration; proxy owns only allowlisted entry negotiation.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
export function isNegotiatedPath(path: string) {
  return path === '/' || path === '/about' || path === '/courses' || path.startsWith('/courses/');
}
