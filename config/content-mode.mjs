import publicRedirects from './redirects.json' with { type: 'json' };

const fixture = process.env.CONTENT_TEST === '1';
if (fixture && process.env.VERCEL) throw new Error('Test content must never be deployed.');

export const contentMode = Object.freeze({
  content: fixture ? 'tests/fixtures' : 'content',
  generated: fixture ? '.source-test' : '.source',
  build: fixture ? '.next-test' : '.next',
});

// Published redirects can overlap routes in the independent fixture catalog.
export const redirects = fixture ? [] : publicRedirects;
