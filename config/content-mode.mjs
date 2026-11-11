import publicRedirects from './redirects.json' with { type: 'json' };
import { assertDeployableContent } from './site-environment.mjs';

const fixture = process.env.CONTENT_TEST === '1';
const development = process.env.NODE_ENV === 'development';
assertDeployableContent();

export const contentMode = Object.freeze({
  content: fixture ? 'tests/fixtures' : 'content',
  generated: `.source${fixture ? '-test' : ''}${development ? '-dev' : ''}`,
  build: fixture ? '.next-test' : '.next',
});

// Published redirects can overlap routes in the independent fixture catalog.
export const redirects = fixture ? [] : publicRedirects;
