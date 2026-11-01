export type EmbedProps = { url: string; title?: string };

function httpsURL(value: string) {
  if (typeof value !== 'string' || /[\s\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port ? url : null;
  } catch { return null; }
}

export function parseXUrl(value: string) {
  const url = httpsURL(value);
  if (!url || !/^(?:(?:www|mobile|m)\.)?(?:x|twitter)\.com$/.test(url.hostname)) return null;
  const match = /^\/(?:[A-Za-z0-9_]{1,15}\/status|i\/(?:web\/)?status)\/([1-9][0-9]{0,19})(?:\/(?:photo|video)\/[1-9][0-9]*)?\/?$/.exec(url.pathname);
  if (!match) return null;
  return { id: match[1], source: `https://x.com/i/status/${match[1]}` };
}

function timestamp(value: string) {
  if (/^\d+$/.test(value)) {
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) ? seconds : null;
  }
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match || !value) return null;
  const seconds = Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
  return Number.isSafeInteger(seconds) ? seconds : null;
}

export function parseYouTubeUrl(value: string) {
  const url = httpsURL(value);
  if (!url) return null;
  let id: string | undefined;
  if (/^(?:www\.)?youtu\.be$/.test(url.hostname)) {
    id = /^\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  } else if (/^(?:(?:www|m)\.)?youtube\.com$/.test(url.hostname)) {
    id = /^\/watch\/?$/.test(url.pathname) ? url.searchParams.get('v') ?? undefined : /^\/(?:embed|shorts)\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  } else if (/^(?:www\.)?youtube-nocookie\.com$/.test(url.hostname)) {
    id = /^\/embed\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const time = url.searchParams.get('start') ?? url.searchParams.get('t') ?? new URLSearchParams(url.hash.slice(1)).get('t');
  const start = time === null ? 0 : timestamp(time);
  if (start === null) return null;
  return { id, start, source: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ''}` };
}
