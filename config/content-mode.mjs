/**
 * [INPUT]: CONTENT_TEST and the Vercel environment marker.
 * [OUTPUT]: Matching content, generated-source, and build directories for the active mode.
 * [POS]: Shared build boundary; public development and fixture validation use separate caches.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
const fixture = process.env.CONTENT_TEST === '1';
if (fixture && process.env.VERCEL) throw new Error('Test content must never be deployed.');

export const contentMode = Object.freeze({
  content: fixture ? 'tests/fixtures' : 'content',
  generated: fixture ? '.source-test' : '.source',
  build: fixture ? '.next-test' : '.next',
});
