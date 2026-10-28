/**
 * [INPUT]: Node DNS and IP primitives, a page URL, and the shared request deadline.
 * [OUTPUT]: A validated public IPv4 address, with HTTPS DNS fallback for proxy-generated benchmark addresses.
 * [POS]: Address policy shared by page, redirect, and cover reads; private addresses are never accepted.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import 'server-only';
import { lookup } from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import { BlockList, isIPv4 } from 'node:net';

const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(address, prefix);
const synthetic = new BlockList();
synthetic.addSubnet('198.18.0.0', 15);

async function proxyFallback(hostname: string, signal: AbortSignal): Promise<LookupAddress[]> {
  // Query a fixed trusted resolver, then validate and pin its real addresses as usual.
  const url = new URL('https://cloudflare-dns.com/dns-query');
  url.search = new URLSearchParams({ name: hostname, type: 'A' }).toString();
  const response = await fetch(url, { headers: { Accept: 'application/dns-json' }, redirect: 'error', signal, cache: 'no-store' });
  if (!response.ok || !response.body) throw new Error('Public DNS lookup failed');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) throw new Error('Public DNS response is too large');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const data = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { Status?: number; Answer?: { type?: number; data?: string }[] };
  if (data.Status !== 0 || !Array.isArray(data.Answer)) throw new Error('Public DNS lookup failed');
  return data.Answer.filter((answer) => answer.type === 1).map((answer) => {
    if (typeof answer.data !== 'string' || !isIPv4(answer.data)) throw new Error('Invalid public DNS address');
    return { address: answer.data, family: 4 };
  });
}

export async function publicAddress(url: URL, signal: AbortSignal) {
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') {
    throw new Error('Preview requires a public HTTPS destination');
  }
  // Resolving only IPv4 excludes IPv4-mapped IPv6 and local IPv6 destinations.
  let addresses = await new Promise<LookupAddress[]>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    lookup(url.hostname, { family: 4, all: true }).then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', abort));
    if (signal.aborted) abort();
  });
  if (addresses.length && addresses.every(({ address }) => synthetic.check(address))) {
    addresses = await proxyFallback(url.hostname, signal);
  }
  if (!addresses.length || addresses.some(({ address }) => blocked.check(address))) {
    throw new Error('Preview destination is not public');
  }
  signal.throwIfAborted();
  return addresses[0].address;
}
