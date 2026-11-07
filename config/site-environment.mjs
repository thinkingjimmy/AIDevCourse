/** @param {Record<string, string | undefined>} env */
export function assertDeployableContent(env = process.env) {
  if (env.CONTENT_TEST === '1' && (env.VERCEL || env.VERCEL_ENV || env.VERCEL_URL)) {
    throw new Error('Test content must never be deployed.');
  }
}

/** @param {string} value @param {boolean} production */
function readOrigin(value, production) {
  let url;
  try { url = new URL(value); } catch { throw new Error('SITE_URL must be an HTTP or HTTPS origin.'); }
  if (!['http:', 'https:'].includes(url.protocol) || value.trim() !== value || url.pathname !== '/' || url.username || url.password || value.includes('?') || value.includes('#')) {
    throw new Error('SITE_URL must be an HTTP or HTTPS origin without credentials, a path, query, or fragment.');
  }
  const hostname = url.hostname.toLowerCase();
  const reserved = /(^|\.)(localhost|local|internal|test|invalid|example|example\.com|example\.net|example\.org)$/;
  const domain = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z](?:[a-z0-9-]*[a-z0-9])?$/;
  if (production && (url.protocol !== 'https:' || url.port || !domain.test(hostname) || reserved.test(hostname))) {
    throw new Error('Production requires a real HTTPS SITE_URL origin on the default port.');
  }
  return url.origin;
}

/** @param {Record<string, string | undefined>} env */
export function resolveSiteEnvironment(env = process.env) {
  assertDeployableContent(env);
  const indexable = env.VERCEL_ENV === 'production';
  if (indexable && !env.SITE_URL) throw new Error('Production requires SITE_URL.');
  if (env.VERCEL_ENV === 'preview') {
    if (!env.VERCEL_URL) throw new Error('Vercel previews require VERCEL_URL. Enable System Environment Variables.');
    return { origin: readOrigin(`https://${env.VERCEL_URL}`, true), indexable: false };
  }
  return { origin: readOrigin(env.SITE_URL || 'http://localhost:3000', indexable), indexable };
}
