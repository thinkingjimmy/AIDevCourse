/**
 * [INPUT]: An allowlisted HTTPS page URL, the public-address policy, and Node HTTPS primitives.
 * [OUTPUT]: Bounded, text-only page metadata from public destinations.
 * [POS]: Network boundary for external link previews; each redirect is checked and DNS is pinned to prevent rebinding.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import 'server-only';
import { request } from 'node:https';
import { publicAddress } from './address';
import type { LinkPreviewData } from './model';

async function readHead(url: URL, signal: AbortSignal, redirects = 0): Promise<{ html: string; url: URL }> {
  const address = await publicAddress(url, signal);
  return new Promise((resolve, reject) => {
    const req = request(url, {
      signal, agent: false, family: 4,
      // Use the validated address while retaining the original TLS hostname.
      lookup: (_hostname, _options, callback) => callback(null, address, 4),
      headers: { Accept: 'text/html', 'Accept-Encoding': 'identity', 'User-Agent': 'AIDevCourse-LinkPreview/1.0' },
    }, (response) => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status)) {
        response.destroy();
        try {
          if (!response.headers.location || redirects >= 3) throw new Error('Too many preview redirects');
          resolve(readHead(new URL(response.headers.location, url), signal, redirects + 1));
        } catch (error) { reject(error); }
        return;
      }
      if (status !== 200 || !/^text\/html\b/i.test(response.headers['content-type'] ?? '') ||
          response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') {
        response.destroy();
        reject(new Error('Preview page is unavailable'));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        resolve({ html: Buffer.concat(chunks).toString('utf8'), url });
        response.destroy();
      };
      response.on('data', (chunk: Buffer) => {
        chunks.push(chunk.subarray(0, Math.max(0, 262144 - size)));
        size += chunk.length;
        if (size >= 262144 || /<\/head\s*>/i.test(Buffer.concat(chunks).toString('utf8'))) finish();
      });
      response.on('end', finish);
      response.on('error', reject);
      response.on('aborted', () => { if (!finished) reject(new Error('Preview response interrupted')); });
    });
    req.on('error', reject);
    req.end();
  });
}

function plainText(value: string, limit: number) {
  const named: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (entity, code: string) => {
    if (!code.startsWith('#')) return named[code.toLowerCase()] ?? entity;
    const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
  }).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

export async function fetchRemotePreview(href: string): Promise<LinkPreviewData> {
  const signal = AbortSignal.timeout(4500);
  const { html, url } = await readHead(new URL(href), signal);
  const head = html.split(/<\/head\s*>/i)[0].replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  const meta = new Map<string, string>();
  for (const tag of head.matchAll(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
    const attributes = new Map<string, string>();
    for (const attribute of tag[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attributes.set(attribute[1].toLowerCase(), attribute[2] ?? attribute[3] ?? attribute[4]);
    }
    const name = (attributes.get('property') ?? attributes.get('name'))?.toLowerCase();
    const content = attributes.get('content');
    if (name && content && !meta.has(name)) meta.set(name, content);
  }
  const title = plainText(meta.get('og:title') || meta.get('twitter:title') || head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] || '', 180);
  const description = plainText(meta.get('og:description') || meta.get('twitter:description') || meta.get('description') || '', 400);
  if (!title && !description) throw new Error('Preview metadata is missing');
  let image: string | undefined;
  const cover = meta.get('og:image') || meta.get('twitter:image');
  if (cover) {
    try {
      const candidate = new URL(plainText(cover, 2048), url);
      await publicAddress(candidate, signal);
      image = candidate.href;
    } catch { /* A missing or unsafe image must not hide useful page text. */ }
  }
  return { title: title || url.hostname, description, ...(image ? { image } : {}) };
}
