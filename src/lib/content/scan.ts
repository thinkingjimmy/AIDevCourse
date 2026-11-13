import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { frontmatter } from 'fumadocs-core/content/md/frontmatter';
import { courseSchema, lessonSchema, metaSchema } from './schema';
import { inspectMarkdown } from './mdx';
import { isLocale, type Locale } from '../i18n/config';
import { coursePath } from '../i18n/routing';
import type { ContentDocument } from './model';
import { contentMode } from '../../../config/content-mode.mjs';
const relativePath = (root: string, path: string) => relative(root, path).replaceAll('\\', '/');
export function contentRoot() {
  // Literal roots keep filesystem tracing inside content instead of the entire repository.
  return contentMode.content === 'tests/fixtures'
    ? join(process.cwd(), 'tests/fixtures')
    : join(process.cwd(), 'content');
}
export function scanContent(root: string) {
  const documents: ContentDocument[] = [];
  const order = new Map<Locale, string[]>();
  const labels = new Map<string, string>();
  function walk(dir: string, locale: Locale, ordered = true) {
    const entries = readdirSync(dir, { withFileTypes: true });
    const metaFile = join(dir, 'meta.json');
    if (!existsSync(metaFile)) throw new Error(`${dir}: missing meta.json`);
    const parsedMeta = metaSchema.safeParse(JSON.parse(readFileSync(metaFile, 'utf8')));
    if (!parsedMeta.success) throw new Error(`${metaFile}: ${parsedMeta.error.message}`);
    const meta = parsedMeta.data;
    if (new Set(meta.pages).size !== meta.pages.length) throw new Error(`${metaFile}: duplicate directory entry`);
    labels.set(relativePath(root, dir), meta.title);
    const contentEntries = entries.filter((entry) => entry.isDirectory() || /\.(md|mdx)$/.test(entry.name) && entry.name !== 'README.md');
    const byName = new Map(contentEntries
      .map((entry) => [entry.name.replace(/\.(md|mdx)$/, ''), entry]));
    const mdFiles = entries.filter((entry) => /\.(md|mdx)$/.test(entry.name) && entry.name !== 'README.md');
    if (new Set(mdFiles.map((entry) => entry.name.replace(/\.(md|mdx)$/, ''))).size !== mdFiles.length) {
      throw new Error(`${dir}: duplicate .md/.mdx path`);
    }
    if (byName.size !== contentEntries.length) throw new Error(`${dir}: a document and directory share the same path`);
    for (const page of meta.pages) if (!byName.has(page)) throw new Error(`${metaFile}: missing directory entry ${page}`);
    for (const [name, entry] of byName) {
      if (entry.isDirectory()) continue;
      const file = join(dir, entry.name);
      const parsed = frontmatter(readFileSync(file, 'utf8'));
      const parts = relativePath(root, file).replace(/\.(md|mdx)$/, '').split('/');
      if (parts.length < 3 || parts.some((part) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part))) {
        throw new Error(`${file}: use language/course/ASCII-slug paths`);
      }
      const isIndex = parts.length === 3 && name === 'index';
      const parsedData = (isIndex ? courseSchema : lessonSchema).safeParse(parsed.data);
      if (!parsedData.success) throw new Error(`${file}: ${parsedData.error.message}`);
      const data = parsedData.data;
      if (!ordered || !meta.pages.includes(name)) throw new Error(`${file}: content missing from explicit directory order`);
      const slug = isIndex ? [] : parts.slice(2);
      const publicSlug = isIndex ? '' : slug[slug.length - 1];
      const url = coursePath(locale, parts[1], publicSlug);
      const { headings, links, achievements, hasJimmyNotes, resourceDiskIds } = inspectMarkdown(parsed.content, file, (parsed.matter.match(/\n/g) ?? []).length);
      documents.push({ file: relativePath(root, file), locale, courseSlug: parts[1], slug, url, data, body: parsed.content, headings, links, achievements, hasJimmyNotes, resourceDiskIds, sourceUrl: '' });
    }
    for (const page of meta.pages) {
      const entry = byName.get(page)!;
      if (entry.isDirectory()) walk(join(dir, entry.name), locale, ordered);
      else if (ordered) order.get(locale)!.push(relativePath(root, join(dir, entry.name)));
    }
    for (const [name, entry] of byName) if (entry.isDirectory() && !meta.pages.includes(name)) walk(join(dir, entry.name), locale, false);
  }
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!isLocale(entry.name)) throw new Error(`${root}: unsupported language directory ${entry.name}`);
    order.set(entry.name, []);
    walk(join(root, entry.name), entry.name);
  }
  return { documents, order, labels };
}
