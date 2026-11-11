import { networkInterfaces } from 'node:os';
import { test, expect } from '@playwright/test';

test.skip(process.env.E2E_DEV !== '1', 'Requires development resource origin checks.');

const localAddresses = [...new Set(Object.values(networkInterfaces()).flatMap(addresses =>
  addresses?.filter(address => address.family === 'IPv4' && !address.internal).map(address => address.address) ?? []))];

test('development scripts accept loopback and local interface origins', async ({ request, baseURL }, testInfo) => {
  const response = await request.get('/zh');
  expect(response.ok()).toBe(true);
  const source = (await response.text()).match(/<script[^>]+src="([^\"]*\/_next\/static\/chunks\/[^\"]+)"/)?.[1];
  expect(source).toBeTruthy();
  const evidence = [];
  try {
    for (const address of ['127.0.0.1', ...localAddresses]) {
      const origin = new URL(baseURL!);
      origin.hostname = address;
      const script = await request.get(source!, { headers: { origin: origin.origin } });
      evidence.push({ origin: origin.origin, status: script.status(), source });
      expect(script.status(), `Client scripts must load for ${origin.origin}`).toBe(200);
      expect(script.headers()['content-type']).toContain('javascript');
    }
  } finally {
    await testInfo.attach('local-development-origins', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  }
});

test('development scripts reject unrelated origins', async ({ request }, testInfo) => {
  const response = await request.get('/zh');
  const source = (await response.text()).match(/<script[^>]+src="([^\"]*\/_next\/static\/chunks\/[^\"]+)"/)?.[1];
  expect(source).toBeTruthy();
  const script = await request.get(source!, { headers: { origin: 'https://untrusted.invalid' } });
  expect(script.status()).toBe(403);
  await testInfo.attach('unrelated-development-origin', {
    body: JSON.stringify({ origin: 'https://untrusted.invalid', status: script.status(), source }, null, 2),
    contentType: 'application/json',
  });
});
