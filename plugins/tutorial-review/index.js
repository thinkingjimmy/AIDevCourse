/**
 * Tutorial Review — Host half.
 *
 * Serves a live, read-only index of the Markdown/MDX courses under
 * `<root>/content/<locale>` plus each lesson source and its review
 * annotations. Nothing is cached: every request rescans the directory, so a
 * browser refresh sees new or edited tutorials immediately.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = dirname(fileURLToPath(import.meta.url));
const ROUTE_PREFIX = '/api/tutorial-review/';
const MANIFEST_PATH = `${ROUTE_PREFIX}manifest`;
const DOC_PATH = `${ROUTE_PREFIX}doc`;
const ASSET_PATH = `${ROUTE_PREFIX}asset`;

const MIME_TYPES = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
]);

export const inject = ['webServer'];

export function apply(ctx, config = {}) {
  const root = resolve(config.root || process.cwd());
  const locale = sanitizeLocale(config.locale || 'zh');
  const contentRoot = join(root, 'content', locale);
  const annotationRoot = join(PLUGIN_ROOT, 'annotations', locale);
  const publicRoot = join(root, 'public');

  const onRequest = (handler) => async (req, res) => {
    const fetchSite = req.headers['sec-fetch-site'];
    if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
    const method = req.method || 'GET';
    if (method !== 'GET' && method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }
    try {
      await handler(new URL(String(req.url || '/'), 'http://localhost'), req, res);
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 500, { error: 'internal-error', message });
    }
  };

  const disposeManifest = ctx.webServer.register({
    kind: 'exact',
    path: MANIFEST_PATH,
    handler: onRequest(async (_url, _req, res) => {
      const manifest = await buildManifest({ root, contentRoot, annotationRoot, locale });
      sendJson(res, 200, manifest);
    }),
  });

  const disposeDoc = ctx.webServer.register({
    kind: 'exact',
    path: DOC_PATH,
    handler: onRequest(async (url, _req, res) => {
      const lessonId = normalizeLessonId(url.searchParams.get('path'));
      if (!lessonId) {
        sendJson(res, 400, { error: 'bad-path', message: 'A lesson path is required.' });
        return;
      }
      const file = lessonFile(contentRoot, lessonId);
      if (!file) {
        sendJson(res, 404, { error: 'not-found', message: 'No such tutorial.' });
        return;
      }
      const [source, info] = await Promise.all([readFile(file, 'utf8'), stat(file)]);
      const meta = parseFrontmatter(source);
      const annotations = await readAnnotations(annotationRoot, lessonId);
      sendJson(res, 200, {
        lessonId,
        courseId: lessonId.split('/')[0] || '',
        section: lessonId.split('/').slice(1, -1).join('/'),
        title: meta.title || firstHeading(source) || lessonId.split('/').pop() || lessonId,
        description: meta.description || '',
        source,
        bytes: info.size,
        mtime: info.mtime.toISOString(),
        annotations,
      });
    }),
  });

  const disposeAsset = ctx.webServer.register({
    kind: 'exact',
    path: ASSET_PATH,
    handler: onRequest(async (url, req, res) => {
      const requested = url.searchParams.get('p') || '';
      const lessonId = normalizeLessonId(url.searchParams.get('base')) || '';
      const file = await resolveAsset({ publicRoot, contentRoot, lessonId, requested });
      if (!file) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }
      const info = await stat(file);
      if (!info.isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': MIME_TYPES.get(extname(file).toLowerCase()) || 'application/octet-stream',
        'content-length': String(body.byteLength),
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      });
      if (req.method === 'HEAD') res.end();
      else res.end(body);
    }),
  });

  ctx.effect(() => () => {
    disposeManifest();
    disposeDoc();
    disposeAsset();
  }, 'tutorial-review: routes');
}

function sanitizeLocale(value) {
  const text = String(value || '').trim();
  return /^[a-z]{2}(?:-[A-Za-z]{2,8})?$/.test(text) ? text : 'zh';
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(Buffer.byteLength(body)),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(body);
}

function normalizeLessonId(raw) {
  if (typeof raw !== 'string') return '';
  const value = raw.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.mdx$/i, '').trim();
  if (!value || value.includes('\0')) return '';
  const parts = value.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) return '';
  if (!/^[A-Za-z0-9._\-\u4e00-\u9fff/]+$/.test(value)) return '';
  return value;
}

function lessonFile(contentRoot, lessonId) {
  const file = resolve(contentRoot, `${lessonId}.mdx`);
  const root = resolve(contentRoot);
  if (file !== root && !file.startsWith(root + sep)) return undefined;
  return existsSync(file) ? file : undefined;
}

async function resolveAsset({ publicRoot, contentRoot, lessonId, requested }) {
  const value = String(requested || '').trim();
  if (!value || value.includes('\0') || /^[a-z]+:/i.test(value) || value.startsWith('//')) return undefined;
  const clean = value.replace(/\\/g, '/');
  const relativeToLesson = lessonId ? join(contentRoot, dirname(lessonId), clean) : undefined;
  const publicPath = clean.startsWith('/') ? join(publicRoot, clean.slice(1)) : join(publicRoot, clean);
  const candidates = [relativeToLesson, publicPath, join(contentRoot, clean)].filter(Boolean);
  for (const candidate of candidates) {
    const file = resolve(candidate);
    if (!existsSync(file)) continue;
    const info = await stat(file);
    if (!info.isFile()) continue;
    if (!MIME_TYPES.has(extname(file).toLowerCase())) continue;
    if (!isInside(file, publicRoot) && !isInside(file, contentRoot)) continue;
    return file;
  }
  return undefined;
}

function isInside(file, root) {
  const target = resolve(file);
  const base = resolve(root);
  return target === base || target.startsWith(base + sep);
}

async function readAnnotations(annotationRoot, lessonId) {
  const file = resolve(annotationRoot, `${lessonId}.json`);
  if (!isInside(file, annotationRoot) || !existsSync(file)) return [];
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8'));
    if (!parsed || !Array.isArray(parsed.annotations)) return [];
    return parsed.annotations
      .filter((item) => item && typeof item.quote === 'string' && item.quote.trim())
      .map((item, index) => ({
        id: typeof item.id === 'string' && item.id ? item.id : `note-${index + 1}`,
        quote: item.quote,
        category: typeof item.category === 'string' ? item.category : '审阅',
        comment: typeof item.comment === 'string' ? item.comment : '',
      }));
  } catch {
    return [];
  }
}

async function buildManifest({ root, contentRoot, annotationRoot, locale }) {
  const generatedAt = new Date().toISOString();
  const rootMeta = await readJson(join(contentRoot, 'meta.json'));
  const courseIds = Array.isArray(rootMeta?.pages) ? rootMeta.pages.map(String) : [];
  const discovered = await discoverCourses(contentRoot);
  const ordered = [...courseIds.filter((id) => discovered.includes(id)), ...discovered.filter((id) => !courseIds.includes(id))];

  const courses = [];
  let totalLessons = 0;
  let totalAnnotations = 0;
  for (const courseId of ordered) {
    const courseDir = join(contentRoot, courseId);
    const courseMeta = await readJson(join(courseDir, 'meta.json'));
    const course = {
      id: courseId,
      title: textOf(courseMeta?.title) || courseId,
      sections: [],
    };
    const pages = Array.isArray(courseMeta?.pages) ? courseMeta.pages.map(String) : [];
    const seen = new Set();
    const sections = new Map();

    const pushLesson = async (lessonId, sectionTitle, filePath) => {
      if (seen.has(lessonId)) return;
      const file = filePath || lessonFile(contentRoot, lessonId);
      if (!file || !existsSync(file)) return;
      let info;
      let source;
      try {
        [source, info] = await Promise.all([readFile(file, 'utf8'), stat(file)]);
      } catch {
        return;
      }
      const meta = parseFrontmatter(source);
      const annotations = await readAnnotations(annotationRoot, lessonId);
      seen.add(lessonId);
      const lesson = {
        lessonId,
        path: lessonId,
        title: meta.title || firstHeading(source) || lessonId.split('/').pop() || lessonId,
        description: meta.description || '',
        bytes: info.size,
        mtime: info.mtime.toISOString(),
        readingMinutes: Math.max(1, Math.round(countCjk(source) / 420)),
        annotationCount: annotations.length,
      };
      totalLessons += 1;
      totalAnnotations += annotations.length;
      const key = sectionTitle || '';
      if (!sections.has(key)) sections.set(key, { title: sectionTitle || null, lessons: [] });
      sections.get(key).lessons.push(lesson);
    };

    for (const page of pages) {
      if (page === 'index') {
        await pushLesson(`${courseId}/index`, null, join(courseDir, 'index.mdx'));
        continue;
      }
      const pageDir = join(courseDir, page);
      const pageMeta = await readJson(join(pageDir, 'meta.json'));
      if (pageMeta && Array.isArray(pageMeta.pages)) {
        for (const child of pageMeta.pages.map(String)) {
          await pushLesson(`${courseId}/${page}/${child}`, textOf(pageMeta.title) || page, undefined);
        }
      } else {
        // A direct lesson page in the course root.
        await pushLesson(`${courseId}/${page}`, null, join(courseDir, `${page}.mdx`));
      }
    }

    // Include lessons that exist on disk but are not listed in meta.json.
    const disk = await listMdx(courseDir);
    for (const file of disk) {
      const rel = relative(courseDir, file).replace(/\\/g, '/').replace(/\.mdx$/i, '');
      const lessonId = `${courseId}/${rel}`;
      if (seen.has(lessonId)) continue;
      const section = rel.includes('/') ? rel.split('/').slice(0, -1).join('/') : null;
      await pushLesson(lessonId, section, file);
    }

    course.sections = [...sections.values()];
    if (course.sections.length === 0) course.sections.push({ title: null, lessons: [] });
    courses.push(course);
  }

  return {
    root,
    locale,
    generatedAt,
    courses,
    totalLessons,
    totalAnnotations,
  };
}

async function discoverCourses(contentRoot) {
  try {
    const entries = await readdir(contentRoot, { withFileTypes: true });
    const ids = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (existsSync(join(contentRoot, entry.name, 'meta.json'))) ids.push(entry.name);
    }
    return ids;
  } catch {
    return [];
  }
}

async function listMdx(dir, out = [], depth = 0) {
  if (depth > 6) return out;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await listMdx(full, out, depth + 1);
    else if (entry.isFile() && entry.name.endsWith('.mdx')) out.push(full);
  }
  return out.sort();
}

function textOf(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && typeof value.title === 'string') return value.title.trim();
  return '';
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return undefined;
  }
}

function parseFrontmatter(source) {
  const text = source.replace(/^\uFEFF/, '');
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end === -1) return {};
  const block = text.slice(3, end).replace(/^\r?\n/, '');
  const meta = {};
  for (const line of block.split(/\r?\n/)) {
    const match = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value) meta[key] = value;
  }
  return meta;
}

function firstHeading(source) {
  const match = /^#\s+(.+)$/m.exec(source);
  return match ? match[1].trim() : '';
}

function countCjk(source) {
  const matches = source.match(/[\u3400-\u9fff]/g);
  return matches ? matches.length : 0;
}
