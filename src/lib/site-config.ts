/**
 * [INPUT]: Deployment environment and a single configured site origin.
 * [OUTPUT]: Brand and metadata configuration with a safe local default.
 * [POS]: Shared site identity; no placeholder production domain is invented.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
export const site = {
  name: 'Learning AI Coding',
  origin: process.env.SITE_URL ?? 'http://localhost:3000',
  indexable: process.env.VERCEL_ENV === 'production',
  preview: process.env.CONTENT_PREVIEW === '1',
};
