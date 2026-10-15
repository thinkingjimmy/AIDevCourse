/**
 * [INPUT]: The root English unavailable document.
 * [OUTPUT]: Full server HTML for paths outside a valid locale.
 * [POS]: Fetch target for the proxy; the browser receives this document with HTTP 404.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
export { default } from '../not-found';
export const metadata = { robots: { index: false, follow: false } };
