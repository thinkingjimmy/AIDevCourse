/**
 * [INPUT]: Deployment environment, the selected brand asset, and a single configured site origin.
 * [OUTPUT]: Shared AIDevCourse name, logo path, and metadata configuration with a safe local default.
 * [POS]: Shared site identity; no placeholder production domain is invented.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
export const site = {
  name: 'AIDevCourse',
  logo: '/images/brand/logo.png',
  origin: process.env.SITE_URL ?? 'http://localhost:3000',
  indexable: process.env.VERCEL_ENV === 'production',
};
