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
const EXTERNAL_SOURCES_PATH = join(PLUGIN_ROOT, 'external-sources.json');
const ROUTE_PREFIX = '/api/tutorial-review/';
const MANIFEST_PATH = `${ROUTE_PREFIX}manifest`;
const DOC_PATH = `${ROUTE_PREFIX}doc`;
const ASSET_PATH = `${ROUTE_PREFIX}asset`;
const ASSIST_PATH = `${ROUTE_PREFIX}assist`;

const MAX_BODY_BYTES = 262144;
const DEFAULT_PROVIDER = 'deepseek-account';
const DEFAULT_MODEL = 'deepseek-flash';

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
  const provider = typeof config.provider === 'string' ? config.provider.trim() : '';
  const model = typeof config.model === 'string' ? config.model.trim() : '';

  const onRequest = (handler) => async (req, res) => {
    if (rejectCrossSite(req, res)) return;
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

  const onPost = (handler) => async (req, res) => {
    if (rejectCrossSite(req, res)) return;
    if ((req.method || 'GET') !== 'POST') {
      res.writeHead(405, { allow: 'POST', 'content-type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }
    try {
      const body = await readJsonBody(req, MAX_BODY_BYTES);
      await handler(body, req, res);
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const status = Number.isInteger(error?.status) ? error.status : 500;
      sendJson(res, status, {
        error: status === 500 ? 'internal-error' : error.code || 'assist-failed',
        message: error instanceof Error ? error.message : String(error),
      });
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

  const disposeAssist = ctx.webServer.register({
    kind: 'exact',
    path: ASSIST_PATH,
    handler: onPost(async (body, req, res) => {
      const output = await handleAssist({ ctx, body, root, contentRoot, annotationRoot, locale, provider, model });
      sendJson(res, 200, output);
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
    disposeAssist();
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

// ---------------------------------------------------------------------------
// Writing assistant: selection actions and link suggestions
// ---------------------------------------------------------------------------

const ASSIST_SYSTEM = `你是 DeepSeek Harness 的“撰写教程助手”，服务对象是中文 AI / 编程教程作者。你的建议必须严谨、具体、可执行；不要编造事实、数据、链接、文件路径或引用。只输出一个 JSON 对象，不要 Markdown 代码围栏、前言或解释。所有文本使用简体中文。`;

const PROOFREAD_SYSTEM = `你是中文技术教程的校对编辑，只检查“错别字”和“语句不通顺”。错别字包括同音字、形近字、重复字和明显打错的词；语句问题包括成分残缺、搭配不当、语序混乱、指代不明、标点造成歧义，以及过长而难以读懂的句子。不要改写作风格，不要把个人偏好当错误，不要编造原文没有的问题。只输出一个 JSON 对象，不要 Markdown 代码围栏、前言或解释。所有文本使用简体中文。`;

const REVIEW_SYSTEM = `你是中文技术教程的审阅编辑，同时负责三项工作：校对错别字与不通顺语句、推荐相关内部章节、推荐权威外部资料。你的建议必须严谨、具体、可执行；不要编造章节、URL、原文或事实。只输出一个 JSON 对象，不要 Markdown 代码围栏、前言或解释。所有文本使用简体中文。`;

const ASSIST_TASKS = new Set(['optimize', 'expand', 'proofread', 'review-enhance', 'internal-links', 'external-links']);

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function httpError(status, code, message) {
  return new HttpError(status, code, message);
}

function rejectCrossSite(req, res) {
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return true;
  }
  return false;
}

async function readJsonBody(req, limit) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw httpError(413, 'body-too-large', '请求内容过大。');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw httpError(400, 'bad-json', '请求体不是合法 JSON。');
  }
}

function clampText(value, max) {
  return String(value == null ? '' : value).replace(/\r\n?/g, '\n').trim().slice(0, max);
}

function normalizeTask(value) {
  const task = typeof value === 'string' ? value.trim() : '';
  return ASSIST_TASKS.has(task) ? task : '';
}

async function handleAssist({ ctx, body, root, contentRoot, annotationRoot, locale, provider, model }) {
  const task = normalizeTask(body?.task);
  if (!task) throw httpError(400, 'bad-task', '未知的写作助手任务。');
  const lessonId = normalizeLessonId(body?.lessonId);
  if (!lessonId) throw httpError(400, 'bad-path', '缺少教程路径。');
  const file = lessonFile(contentRoot, lessonId);
  if (!file) throw httpError(404, 'not-found', '没有找到这篇教程。');
  const source = await readFile(file, 'utf8');
  const meta = parseFrontmatter(source);
  const title = meta.title || firstHeading(source) || lessonId;
  const description = meta.description || '';
  const scope = body?.scope === 'lesson' ? 'lesson' : 'selection';
  const selection = clampText(body?.selection || (scope === 'lesson' ? title : ''), 4000);
  if (!selection) throw httpError(400, 'bad-selection', '没有选中文本。');
  const context = clampText(body?.context || (scope === 'lesson' ? plainTextOfMdx(source).slice(0, 3000) : ''), 8000);

  if (task === 'internal-links') {
    return suggestInternalLinks({ ctx, root, contentRoot, annotationRoot, locale, lessonId, title, description, selection, context, scope, source, provider, model });
  }
  if (task === 'external-links') {
    return suggestExternalLinks({ ctx, title, description, selection, context, scope, source, provider, model });
  }

  if (task === 'review-enhance') {
    return reviewEnhance({ ctx, root, contentRoot, annotationRoot, locale, lessonId, title, description, source, provider, model });
  }
  if (task === 'proofread') {
    return proofreadLesson({ ctx, source, title, description, selection, context, scope, provider, model });
  }

  const route = await resolveLlm(ctx, provider, model);
  if (task === 'optimize') {
    const prompt = [
      `教程标题：${title}`,
      description ? `教程简介：${description}` : '',
      `选中文本：\n${selection}`,
      context ? `上下文：\n${context}` : '',
      '',
      '任务：优化「选中文本」的表达，使其更易理解，减少病句和错字。保留原意、术语、事实和语气，不要新增未经证实的信息，不要改成营销腔，不要重写上下文。',
      '只输出 JSON：{"rewrite":"优化后的完整文本","notes":["具体的改动点，最多 4 条"]}',
    ].filter(Boolean).join('\n\n');
    const text = await streamText(route, ASSIST_SYSTEM, prompt, { maxTokens: 1800, temperature: 0.35 });
    const parsed = parseModelJson(text);
    if (Array.isArray(parsed)) throw httpError(502, 'bad-model-output', '模型返回了数组而不是对象，请重试。');
    const rewrite = clampText(parsed.rewrite, 8000);
    if (!rewrite) throw httpError(502, 'bad-model-output', '模型没有返回优化后的文本，请重试。');
    const notes = toStringList(parsed.notes, 4, 300);
    return { task, kind: 'optimize', rewrite, notes };
  }

  const prompt = [
    `教程标题：${title}`,
    description ? `教程简介：${description}` : '',
    `选中文本：\n${selection}`,
    context ? `上下文：\n${context}` : '',
    '',
    '任务：阅读上下文，为「选中文本」提供 3–5 个不同的扩写方向。每个方向说明可以补充什么、为什么值得补充，以及可用的例子、对照或读者可能关心的问题。方向之间要有明显差异，不要只是同义改写，不要虚构数据。',
    '只输出 JSON：{"directions":[{"title":"方向名","detail":"2–4 句具体建议"}]}',
  ].filter(Boolean).join('\n\n');
  const text = await streamText(route, ASSIST_SYSTEM, prompt, { maxTokens: 1800, temperature: 0.55 });
  const parsed = parseModelJson(text);
  if (Array.isArray(parsed)) throw httpError(502, 'bad-model-output', '模型返回了数组而不是对象，请重试。');
  const directions = toDirections(parsed.directions);
  if (directions.length === 0) throw httpError(502, 'bad-model-output', '模型没有返回可用的扩写方向，请重试。');
  return { task, kind: 'expand', directions };
}

async function proofreadLesson({ ctx, source, title, description, selection, context, scope, provider, model }) {
  const route = await resolveLlm(ctx, provider, model);
  const lessonText = proofreadTextOfMdx(source).slice(0, 14000);
  const subject = scope === 'selection' ? selection : lessonText;
  if (!normalizeWhitespace(subject)) {
    return { task: 'proofread', kind: 'proofread', issues: [], note: '没有可校对的正文。', scope };
  }
  const prompt = [
    `教程标题：${title}`,
    description ? `教程简介：${description}` : '',
    scope === 'selection' ? `只检查下面的选中文本，不要报告上下文中的问题：\n${selection}` : `需要校对的正文：\n${lessonText}`,
    scope === 'selection' && context ? `参考上下文（不要报告其中的问题）：\n${context}` : '',
    '',
    '请找出真正需要修改的问题。每条 quote 必须是原文中连续的一段纯文本（不带 Markdown、HTML 或 JSX 标记），尽量短；suggestion 是建议改法；reason 用一句话说明问题。没有问题时返回空数组。最多返回 8 条，按严重程度排序。',
    '只输出 JSON：{"issues":[{"type":"typo","quote":"原文片段","suggestion":"建议改为","reason":"问题说明"}]}',
    'type 只能是 "typo"（错别字）或 "grammar"（语句不通顺）。',
  ].filter(Boolean).join('\n\n');
  const text = await streamText(route, PROOFREAD_SYSTEM, prompt, { maxTokens: 4200, temperature: 0.1 });
  let parsed;
  try {
    parsed = parseModelJson(text);
  } catch {
    const retryPrompt = `${prompt}\n\n上一次输出不是合法 JSON。请只输出一个 JSON 对象（不要数组、不要 Markdown），最多 5 条问题，不要任何解释。`;
    const retryText = await streamText(route, PROOFREAD_SYSTEM, retryPrompt, { maxTokens: 4200, temperature: 0 });
    try {
      parsed = parseModelJson(retryText);
    } catch {
      throw httpError(502, 'bad-model-output', '模型两次返回的内容都不是合法 JSON，请重试。');
    }
  }
  const issues = normalizeProofreadIssues(Array.isArray(parsed) ? parsed : parsed.issues, subject);
  return {
    task: 'proofread',
    kind: 'proofread',
    issues,
    scope,
    note: issues.length === 0 ? '未发现明显的语句或错字问题。' : '',
  };
}

function normalizeProofreadIssues(value, sourceText) {
  if (!Array.isArray(value)) return [];
  const normalizedSource = normalizeWhitespace(sourceText);
  const seen = new Set();
  const issues = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const type = item.type === 'typo' || item.type === '错别字' ? 'typo' : item.type === 'grammar' || item.type === '语句不通顺' ? 'grammar' : '';
    if (!type) continue;
    const quote = normalizeWhitespace(item.quote).slice(0, 180);
    if (quote.length < 2 || !normalizedSource.includes(quote)) continue;
    if (seen.has(`${type}:${quote}`)) continue;
    seen.add(`${type}:${quote}`);
    const suggestion = clampText(item.suggestion, 260);
    const reason = clampText(item.reason, 320);
    if (!suggestion) continue;
    issues.push({
      type,
      quote,
      suggestion,
      reason: reason || '建议核对后修改。',
    });
    if (issues.length >= 8) break;
  }
  return issues;
}

function proofreadTextOfMdx(source) {
  return normalizeWhitespace(
    String(source || '')
      .replace(/^---[\s\S]*?\n---\r?\n?/, '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, ' ')
      .replace(/\|/g, ' ')
      .replace(/\((?:https?:\/\/|mailto:)[^)]*\)/gi, ' ')
      .replace(/[#>*_~\[\]()!]/g, ' ')
      .replace(/\{[\s\S]*?\}/g, ' '),
  );
}

function normalizeWhitespace(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

async function reviewEnhance({ ctx, root, contentRoot, annotationRoot, locale, lessonId, title, description, source, provider, model }) {
  const route = await resolveLlm(ctx, provider, model);
  const bodyText = proofreadTextOfMdx(source).slice(0, 14000);
  if (!normalizeWhitespace(bodyText)) {
    return {
      task: 'review-enhance',
      kind: 'review-enhance',
      issues: [],
      internalLinks: [],
      externalLinks: [],
      note: '没有可审阅的正文。',
      generatedAt: new Date().toISOString(),
    };
  }

  const manifest = await buildManifest({ root, contentRoot, annotationRoot, locale });
  const lessons = [];
  for (const course of manifest.courses) {
    for (const section of course.sections) {
      for (const lesson of section.lessons) {
        if (lesson.lessonId !== lessonId) lessons.push({ ...lesson, courseTitle: course.title, sectionTitle: section.title });
      }
    }
  }
  const candidates = await rankInternalCandidates(contentRoot, `${title}\n${description}\n${bodyText}`, lessons);
  const { sources, sourceNote } = await collectExternalSources(
    ctx,
    `${title} ${description} ${bodyText}`.replace(/\s+/g, ' ').trim().slice(0, 320),
  );

  const prompt = [
    `教程标题：${title}`,
    description ? `教程简介：${description}` : '',
    '请一次完成三件事，并只输出一个 JSON 对象：',
    'A. 校对当前教程：找错别字和语句不通顺，type 只能是 "typo" 或 "grammar"，最多 8 条。',
    'B. 内链建议：只能从候选章节的 lessonId 中选择，最多 3 条。',
    'C. 外链建议：只能从候选来源的 URL 中选择，最多 3 条；优先官方文档、标准、论文或机构资料。',
    '每条 issues 和链接建议都要有 quote：必须是当前教程原文中逐字出现的一小段连续纯文本（不带 Markdown/HTML/JSX），用于页面划线。没有合适结果就返回空数组；不要编造章节、URL 或原文。',
    '输出格式：{"issues":[{"type":"typo","quote":"原文片段","suggestion":"建议","reason":"说明"}],"internalLinks":[{"lessonId":"候选中的 ID","reason":"理由","quote":"当前教程原文"}],"externalLinks":[{"url":"候选中的 URL","reason":"理由","quote":"当前教程原文"}]}',
    `当前教程原文：\n${bodyText}`,
    `候选章节：\n${JSON.stringify(candidates.map(({ lessonId: id, title: candidateTitle, description: candidateDescription, excerpt }) => ({ lessonId: id, title: candidateTitle, description: candidateDescription, excerpt })))}`,
    `候选来源：\n${JSON.stringify(sources.map(({ url, title: sourceTitle, domain, publisher, snippet }) => ({ url, title: sourceTitle, domain, publisher, snippet })))}`,
  ].filter(Boolean).join('\n\n');

  const text = await streamText(route, REVIEW_SYSTEM, prompt, { maxTokens: 6000, temperature: 0.1 });
  let parsed;
  try {
    parsed = parseModelJson(text);
  } catch {
    const retryPrompt = `${prompt}\n\n上一次输出不是合法 JSON。请只输出一个 JSON 对象，最多 5 条 issues、2 条内链、2 条外链，不要任何解释。`;
    const retryText = await streamText(route, REVIEW_SYSTEM, retryPrompt, { maxTokens: 5000, temperature: 0 });
    try {
      parsed = parseModelJson(retryText);
    } catch {
      throw httpError(502, 'bad-model-output', '模型两次返回的内容都不是合法 JSON，请重试。');
    }
  }
  const normalized = Array.isArray(parsed) ? { issues: parsed, internalLinks: [], externalLinks: [] } : parsed;

  const issues = normalizeProofreadIssues(normalized.issues, bodyText);
  const internalLinks = toInternalLinks(
    Array.isArray(normalized.internalLinks) ? normalized.internalLinks : Array.isArray(normalized.internal) ? normalized.internal : [],
    candidates,
    bodyText,
    'lesson',
  );
  const externalLinks = toExternalLinks(
    Array.isArray(normalized.externalLinks) ? normalized.externalLinks : Array.isArray(normalized.external) ? normalized.external : [],
    sources,
    bodyText,
    'lesson',
  );

  return {
    task: 'review-enhance',
    kind: 'review-enhance',
    issues,
    internalLinks,
    externalLinks,
    note: issues.length === 0 && internalLinks.length === 0 && externalLinks.length === 0 ? '未发现明显的校对或链接建议。' : '',
    sourcesNote: sourceNote,
    generatedAt: new Date().toISOString(),
  };
}

async function suggestInternalLinks({ ctx, root, contentRoot, annotationRoot, locale, lessonId, title, description, selection, context, scope, source, provider, model }) {
  const manifest = await buildManifest({ root, contentRoot, annotationRoot, locale });
  const lessons = [];
  for (const course of manifest.courses) {
    for (const section of course.sections) {
      for (const lesson of section.lessons) {
        if (lesson.lessonId !== lessonId) lessons.push({ ...lesson, courseTitle: course.title, sectionTitle: section.title });
      }
    }
  }
  const query = `${title}\n${selection}\n${context}`;
  const candidates = await rankInternalCandidates(contentRoot, query, lessons);
  if (candidates.length === 0) {
    return { task: 'internal-links', kind: 'internal-links', links: [], fallback: false, note: '没有找到足够相关的其他章节。' };
  }

  const route = await resolveLlm(ctx, provider, model);
  const quoteSource = scope === 'lesson' ? plainTextOfMdx(source).slice(0, 14000) : selection;
  const prompt = [
    `当前教程：${title}`,
    description ? `当前简介：${description}` : '',
    `选中文本：\n${selection}`,
    context ? `上下文：\n${context}` : '',
    `当前教程原文（每条 quote 必须逐字来自这里，不要来自候选章节）：\n${quoteSource}`,
    '',
    '任务：判断这段内容与哪些其他教程章节有真实联系，给出 0–3 条内部链接建议。只能从下面的候选中选择 lessonId；关系弱或只是同一门课，就不要推荐。reason 要说明读者为什么应跳转、跳转后能获得什么。每条建议还要给出 quote：当前教程中与这个推荐最相关的一小段连续原文，供页面划线定位。',
    '只输出 JSON：{"links":[{"lessonId":"候选中的 lessonId","reason":"具体理由","quote":"当前教程中的原文片段"}]}',
    '候选章节：',
    JSON.stringify(candidates.map(({ lessonId: id, title: candidateTitle, description: candidateDescription, excerpt }) => ({
      lessonId: id,
      title: candidateTitle,
      description: candidateDescription,
      excerpt,
    }))),
  ].filter(Boolean).join('\n\n');

  try {
    const text = await streamText(route, ASSIST_SYSTEM, prompt, { maxTokens: 1800, temperature: 0.2 });
    const parsed = parseModelJson(text);
    const links = toInternalLinks(Array.isArray(parsed) ? parsed : parsed.links, candidates, quoteSource, scope);
    return { task: 'internal-links', kind: 'internal-links', links, fallback: false, note: links.length === 0 ? '模型判断没有足够强的章节关联。' : '' };
  } catch {
    return {
      task: 'internal-links',
      kind: 'internal-links',
      links: candidates
        .slice(0, 3)
        .map((candidate) => {
          const fallback = scope === 'lesson'
            ? findRelevantSentence(quoteSource, `${candidate.title} ${candidate.description || ''}`)
            : quoteSource;
          return {
            lessonId: candidate.lessonId,
            title: candidate.title,
            reason: `与选中内容共享关键词，可作为延伸阅读；建议人工确认关联是否成立。`,
            quote: chooseLinkQuote('', quoteSource, fallback),
          };
        })
        .filter((link) => link.quote),
      fallback: true,
      note: '模型暂时不可用，先给出关键词匹配结果。',
    };
  }
}

async function collectExternalSources(ctx, query) {
  const curated = await rankCuratedSources(query);
  let webSources = [];
  let webError = '';
  const web = ctx.get('web');
  if (web) {
    try {
      const search = await web.search({ query, maxResults: 8 }, AbortSignal.timeout(30000));
      webSources = normalizeSearchSources(search?.sources);
    } catch (error) {
      webError = error instanceof Error ? error.message : String(error);
    }
  }
  const sources = mergeSources(curated, webSources);
  const sourceNote =
    curated.length > 0 && webSources.length === 0
      ? web
        ? webError
          ? '联网搜索不可用，以下建议来自内置权威来源库。'
          : '以下建议来自内置权威来源库。'
        : '当前未配置联网搜索，以下建议来自内置权威来源库。'
      : '';
  return { sources, webError, sourceNote, curatedCount: curated.length, webCount: webSources.length };
}

async function suggestExternalLinks({ ctx, title, description, selection, context, scope, source, provider, model }) {
  const query = `${title} ${selection} ${context}`.replace(/\s+/g, ' ').trim().slice(0, 320);
  const { sources, webError, sourceNote } = await collectExternalSources(ctx, query);
  if (sources.length === 0) {
    return {
      task: 'external-links',
      kind: 'external-links',
      links: [],
      fallback: false,
      note: webError
        ? `外部搜索不可用，内置来源库也没有足够匹配的内容：${webError}`
        : '没有找到足够相关、可引用的权威外部内容。',
    };
  }

  const quoteSource = scope === 'lesson' ? plainTextOfMdx(source).slice(0, 14000) : selection;

  let route;
  try {
    route = await resolveLlm(ctx, provider, model);
  } catch (error) {
    return {
      task: 'external-links',
      kind: 'external-links',
      links: sources
        .slice(0, 3)
        .map((source) => {
          const fallback = scope === 'lesson'
            ? findRelevantSentence(quoteSource, `${source.title} ${source.snippet || ''}`)
            : quoteSource;
          return {
            url: source.url,
            title: source.title,
            domain: source.domain,
            snippet: source.snippet,
            reason: '与选中内容相关；请先核对来源权威性与时效性再引用。',
            quote: chooseLinkQuote('', quoteSource, fallback),
          };
        })
        .filter((link) => link.quote),
      fallback: true,
      note: [sourceNote, '模型暂时不可用，先给出候选来源。'].filter(Boolean).join(' '),
    };
  }
  const prompt = [
    `教程标题：${title}`,
    description ? `教程简介：${description}` : '',
    `选中文本：\n${selection}`,
    context ? `上下文：\n${context}` : '',
    `当前教程原文（每条 quote 必须逐字来自这里）：\n${quoteSource}`,
    '',
    '任务：根据这段内容和下面的候选来源，给出 0–3 个值得引用的权威外部链接。只能使用候选中的 URL；优先官方文档、标准组织、大学/研究机构、原始论文或知名百科。若来源不权威、不相关或只是营销页面，返回空数组。reason 要说明关联和阅读价值。每条建议还要给出 quote：当前教程中与这条外部资料最相关的一小段连续原文，供页面划线定位。',
    '只输出 JSON：{"links":[{"url":"候选中出现的 URL","reason":"具体理由","quote":"当前教程中的原文片段"}]}',
    '候选来源：',
    JSON.stringify(
      sources.map(({ url, title: sourceTitle, domain, publisher, snippet }) => ({
        url,
        title: sourceTitle,
        domain,
        publisher,
        snippet,
      })),
    ),
  ].filter(Boolean).join('\n\n');

  try {
    const text = await streamText(route, ASSIST_SYSTEM, prompt, { maxTokens: 2000, temperature: 0.2 });
    const parsed = parseModelJson(text);
    const links = toExternalLinks(Array.isArray(parsed) ? parsed : parsed.links, sources, quoteSource, scope);
    return {
      task: 'external-links',
      kind: 'external-links',
      links,
      fallback: false,
      note: links.length === 0 ? '模型判断没有足够权威、直接相关的外部来源。' : sourceNote,
    };
  } catch (error) {
    if (error instanceof HttpError && error.status === 503) throw error;
    return {
      task: 'external-links',
      kind: 'external-links',
      links: sources
        .slice(0, 3)
        .map((source) => {
          const fallback = scope === 'lesson'
            ? findRelevantSentence(quoteSource, `${source.title} ${source.snippet || ''}`)
            : quoteSource;
          return {
            url: source.url,
            title: source.title,
            domain: source.domain,
            snippet: source.snippet,
            reason: '与选中内容相关；请先核对来源权威性与时效性再引用。',
            quote: chooseLinkQuote('', quoteSource, fallback),
          };
        })
        .filter((link) => link.quote),
      fallback: true,
      note: [sourceNote, '模型暂时不可用，先给出候选来源。'].filter(Boolean).join(' '),
    };
  }
}

async function rankCuratedSources(query) {
  const data = await readJson(EXTERNAL_SOURCES_PATH);
  const items = Array.isArray(data?.sources) ? data.sources : [];
  const queryTerms = termsOf(query);
  if (queryTerms.size === 0) return [];
  return items
    .map((item) => {
      const target = termsOf(
        `${item.title || ''} ${item.publisher || ''} ${(item.keywords || []).join(' ')} ${item.summary || ''}`,
      );
      return {
        url: item.url,
        title: item.title || domainOf(item.url),
        domain: domainOf(item.url),
        publisher: item.publisher || '',
        snippet: item.summary || '',
        score: overlapScore(queryTerms, target),
      };
    })
    .filter((item) => item.url && item.score >= 0.008)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function mergeSources(curated, webSources) {
  const map = new Map();
  // Keep both the strongest curated entries and every web result visible to
  // the model: a full curated list must not crowd out fresh search results.
  const ordered = [...curated.slice(0, 5), ...webSources, ...curated.slice(5)];
  for (const source of ordered) {
    if (!source || typeof source.url !== 'string') continue;
    const key = normalizeUrl(source.url);
    if (!key || map.has(key)) continue;
    map.set(key, {
      url: source.url,
      title: source.title || domainOf(source.url),
      domain: source.domain || domainOf(source.url),
      publisher: source.publisher || '',
      snippet: source.snippet || '',
    });
  }
  return [...map.values()].slice(0, 10);
}

function domainOf(value) {
  try {
    return new URL(String(value || '')).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

async function resolveLlm(ctx, configuredProvider, configuredModel) {
  const llm = ctx.get('llm');
  if (!llm) throw httpError(503, 'llm-unavailable', '撰写助手需要可用的模型服务，请确认当前 DSH 已登录并配置模型。');
  let providers;
  try {
    providers = llm.listProviders();
  } catch (error) {
    throw httpError(503, 'llm-unavailable', `读取模型路由失败：${error instanceof Error ? error.message : String(error)}`);
  }
  if (!Array.isArray(providers) || providers.length === 0) {
    throw httpError(503, 'llm-unavailable', '当前没有可用的模型路由。');
  }
  const preferred = configuredProvider || DEFAULT_PROVIDER;
  const route = providers.find((item) => item.id === preferred) || providers[0];
  let model = route.id === preferred ? configuredModel : '';
  if (!model) {
    try {
      const models = await llm.listModels(route.id);
      model = models[0]?.id || '';
    } catch {
      model = '';
    }
  }
  if (!model) model = route.id === DEFAULT_PROVIDER ? DEFAULT_MODEL : '';
  if (!model) throw httpError(503, 'llm-unavailable', `模型路由 ${route.id} 没有可用模型。`);
  return { llm, provider: route.id, model };
}

async function streamText(route, system, user, { maxTokens, temperature }) {
  const options = {
    provider: route.provider,
    model: route.model,
    system,
    messages: [{ role: 'user', content: [{ type: 'text', text: user }] }],
    temperature,
    maxTokens,
    signal: AbortSignal.timeout(120000),
  };
  let text = '';
  let finished = false;
  try {
    for await (const chunk of route.llm.stream(options)) {
      if (chunk.type === 'text-delta') text += chunk.text;
      if (chunk.type === 'finish') {
        finished = true;
        if (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted') {
          const failure = chunk.reason.failure || {};
          throw new Error(`${chunk.reason.kind} ${failure.code || ''}: ${failure.message || '模型调用中断'}`);
        }
        if (chunk.reason.kind !== 'stop' && chunk.reason.kind !== 'max-tokens') {
          throw new Error(`模型以 ${chunk.reason.kind} 结束`);
        }
      }
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw httpError(502, 'llm-failed', `模型调用失败：${error instanceof Error ? error.message : String(error)}`);
  }
  if (!finished) throw httpError(502, 'llm-failed', '模型没有正常结束，请重试。');
  return text;
}

function parseModelJson(text) {
  const raw = String(text || '').replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  if (!raw) throw httpError(502, 'bad-model-output', '模型返回了空内容，请重试。');
  const candidates = [raw, extractJsonValue(raw)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      /* try the next candidate */
    }
  }
  throw httpError(502, 'bad-model-output', '模型返回的内容不是 JSON，请重试。');
}

function extractJsonValue(text) {
  const objectStart = text.indexOf('{');
  const arrayStart = text.indexOf('[');
  let start = -1;
  if (objectStart === -1) start = arrayStart;
  else if (arrayStart === -1) start = objectStart;
  else start = Math.min(objectStart, arrayStart);
  if (start < 0) return '';
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return '';
}

function toStringList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .slice(0, maxItems)
    .map((item) => clampText(item, maxLength));
}

function toDirections(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      title: clampText(item?.title, 80),
      detail: clampText(item?.detail, 700),
    }))
    .filter((item) => item.title && item.detail)
    .slice(0, 5);
}

function toInternalLinks(value, candidates, quoteSource, scope) {
  if (!Array.isArray(value)) return [];
  const byId = new Map(candidates.map((item) => [item.lessonId, item]));
  const byTitle = new Map(candidates.map((item) => [item.title, item]));
  const seen = new Set();
  const links = [];
  for (const item of value) {
    const rawId = typeof item?.lessonId === 'string' ? item.lessonId : typeof item?.id === 'string' ? item.id : '';
    const rawTitle = typeof item?.title === 'string' ? item.title : '';
    const candidate = byId.get(rawId) || byTitle.get(rawTitle);
    if (!candidate || seen.has(candidate.lessonId)) continue;
    const reason = clampText(item?.reason, 500) || '与当前内容相关，可作为延伸阅读。';
    const fallback = scope === 'lesson'
      ? findRelevantSentence(quoteSource, `${candidate.title} ${candidate.description || ''} ${reason}`)
      : quoteSource;
    const quote = chooseLinkQuote(item?.quote, quoteSource, fallback);
    if (!quote) continue;
    seen.add(candidate.lessonId);
    links.push({
      lessonId: candidate.lessonId,
      title: candidate.title,
      reason,
      quote,
    });
    if (links.length >= 3) break;
  }
  return links;
}

function toExternalLinks(value, sources, quoteSource, scope) {
  if (!Array.isArray(value)) return [];
  const byUrl = new Map(sources.map((item) => [normalizeUrl(item.url), item]));
  const seen = new Set();
  const links = [];
  for (const item of value) {
    const source = byUrl.get(normalizeUrl(item?.url ?? item?.href));
    if (!source || seen.has(source.url)) continue;
    const reason = clampText(item?.reason, 500) || '可作为该内容的权威延伸阅读。';
    const fallback = scope === 'lesson'
      ? findRelevantSentence(quoteSource, `${source.title} ${source.snippet || ''} ${reason}`)
      : quoteSource;
    const quote = chooseLinkQuote(item?.quote, quoteSource, fallback);
    if (!quote) continue;
    seen.add(source.url);
    links.push({
      url: source.url,
      title: source.title,
      domain: source.domain,
      snippet: source.snippet,
      reason,
      quote,
    });
    if (links.length >= 3) break;
  }
  return links;
}

function chooseLinkQuote(raw, quoteSource, fallback) {
  const source = normalizeWhitespace(quoteSource);
  if (!source) return '';
  const sourceCompact = source.replace(/\s+/g, '');
  const normalized = normalizeWhitespace(raw).slice(0, 240);
  if (normalized.length >= 4 && sourceCompact.includes(normalized.replace(/\s+/g, ''))) return normalized;
  const fallbackText = normalizeWhitespace(fallback).slice(0, 240);
  if (fallbackText.length >= 4 && source.includes(fallbackText)) return fallbackText;
  const sentence = findRelevantSentence(source, fallbackText);
  if (sentence) return sentence;
  return source.slice(0, 180);
}

function findRelevantSentence(source, query) {
  const sentences = String(source || '')
    .split(/(?<=[。！？!?；;])\s*/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 6 && sentence.length <= 320);
  if (sentences.length === 0) return '';
  const queryTerms = termsOf(query);
  let best = '';
  let bestScore = 0;
  for (const sentence of sentences) {
    const score = overlapScore(queryTerms, termsOf(sentence));
    if (score > bestScore) {
      best = sentence;
      bestScore = score;
    }
  }
  return best ? best.slice(0, 240) : '';
}

function normalizeSearchSources(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const sources = [];
  for (const item of value) {
    if (!item || typeof item.url !== 'string') continue;
    const url = item.url.trim();
    if (!/^https?:\/\//i.test(url)) continue;
    const key = normalizeUrl(url);
    if (seen.has(key)) continue;
    seen.add(key);
    let domain = '';
    try {
      domain = new URL(url).hostname.replace(/^www\./i, '');
    } catch {
      continue;
    }
    sources.push({
      url,
      title: clampText(item.title, 200) || domain,
      domain,
      snippet: clampText(item.snippet, 600),
    });
    if (sources.length >= 8) break;
  }
  return sources;
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || ''));
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    let text = url.toString();
    if (text.endsWith('/') && url.pathname !== '/') text = text.slice(0, -1);
    return text;
  } catch {
    return '';
  }
}

async function rankInternalCandidates(contentRoot, query, lessons) {
  const queryTerms = termsOf(query);
  if (queryTerms.size === 0) return [];
  const scored = [];
  for (const lesson of lessons) {
    const file = lessonFile(contentRoot, lesson.lessonId);
    if (!file) continue;
    let source = '';
    try {
      source = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    const body = plainTextOfMdx(source);
    const bodyTerms = termsOf(body);
    const metaTerms = termsOf(`${lesson.title} ${lesson.description || ''}`);
    const bodyScore = overlapScore(queryTerms, bodyTerms);
    const metaScore = overlapScore(queryTerms, metaTerms);
    const score = bodyScore + metaScore * 0.35;
    if (score <= 0) continue;
    scored.push({
      lessonId: lesson.lessonId,
      title: lesson.title,
      description: lesson.description || '',
      excerpt: body.slice(0, 260),
      score,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 8);
}

function termsOf(value) {
  const set = new Set();
  const text = String(value || '').toLowerCase();
  for (const word of text.match(/[a-z0-9]{2,}/g) || []) set.add(word);
  const cjk = text.replace(/[^\u3400-\u9fff]/g, '');
  for (let index = 0; index < cjk.length - 1; index += 1) set.add(cjk.slice(index, index + 2));
  return set;
}

function overlapScore(query, target) {
  if (target.size === 0) return 0;
  let hits = 0;
  for (const term of query) if (target.has(term)) hits += 1;
  return hits / Math.max(1, query.size);
}

function plainTextOfMdx(source) {
  return String(source || '')
    .replace(/^---[\s\S]*?\n---\r?\n?/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~\[\]()!]/g, ' ')
    .replace(/\{[\s\S]*?\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
