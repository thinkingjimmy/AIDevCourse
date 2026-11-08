/** @param {Record<string, string | undefined>} env */
export function assertDeployableContent(env = process.env) {
  if (env.CONTENT_TEST === '1' && (env.VERCEL || env.VERCEL_ENV || env.VERCEL_URL || env.VERCEL_PROJECT_PRODUCTION_URL)) {
    throw new Error('Test content must never be deployed.');
  }
}

/** @param {Record<string, string | undefined>} env @param {string} variable */
function readVercelOrigin(env, variable) {
  const value = env[variable];
  if (!value) throw new Error(`${variable} is required. Enable System Environment Variables in Vercel.`);
  const hostname = value.toLowerCase();
  const reserved = /(^|\.)(localhost|local|internal|test|invalid|example|example\.com|example\.net|example\.org)$/;
  const domain = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z](?:[a-z0-9-]*[a-z0-9])?$/;
  if (value.trim() !== value || !domain.test(hostname) || reserved.test(hostname)) {
    throw new Error(`${variable} must be a public hostname without a protocol, port, path, credentials, query, or fragment.`);
  }
  return `https://${hostname}`;
}

/** @param {Record<string, string | undefined>} env */
export function resolveSiteEnvironment(env = process.env) {
  assertDeployableContent(env);
  const indexable = env.VERCEL_ENV === 'production';
  if (indexable || env.VERCEL_ENV === 'preview') {
    const variable = indexable ? 'VERCEL_PROJECT_PRODUCTION_URL' : 'VERCEL_URL';
    return { origin: readVercelOrigin(env, variable), indexable };
  }
  return { origin: 'http://localhost:3000', indexable: false };
}
