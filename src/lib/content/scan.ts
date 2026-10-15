/**
 * [INPUT]: Locale folders in content/ or tests/fixtures/, frontmatter schemas, and Markdown inspection.
 * [OUTPUT]: Parsed documents whose public lesson URLs omit the module, plus explicit per-language ordering and module labels.
 * [POS]: Filesystem adapter; no UI consumer reads content directories directly.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import { documentSchema, metaSchema } from './schema';
import { inspectMarkdown } from './mdx';
import { isLocale, type Locale } from '../i18n/config';
import type { ContentDocument } from './types';
export function contentRoot() {
  if (process.env.CONTENT_TEST === '1') {
    if (process.env.VERCEL) throw new Error('Test content cannot be deployed');
    return join(process.cwd(), 'tests/fixtures');
  }
  return join(process.cwd(), 'content');
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
    labels.set(relative(root, dir), meta.title);
    const byName = new Map(entries.filter((entry) => entry.isDirectory() || /\.(md|mdx)$/.test(entry.name) && entry.name !== 'README.md')
      .map((entry) => [entry.name.replace(/\.(md|mdx)$/, ''), entry]));
    const mdFiles = entries.filter((entry) => /\.(md|mdx)$/.test(entry.name) && entry.name !== 'README.md');
    if (new Set(mdFiles.map((entry) => entry.name.replace(/\.(md|mdx)$/, ''))).size !== mdFiles.length) {
      throw new Error(`${dir}: duplicate .md/.mdx path`);
    }
    for (const page of meta.pages) if (!byName.has(page)) throw new Error(`${metaFile}: missing directory entry ${page}`);
    for (const [name, entry] of byName) {
      if (entry.isDirectory()) continue;
      const file = join(dir, entry.name);
      const parsed = matter(readFileSync(file, 'utf8'));
      const parsedData = documentSchema.safeParse(parsed.data);
      if (!parsedData.success) throw new Error(`${file}: ${parsedData.error.message}`);
      const data = parsedData.data;
      const parts = relative(root, file).replace(/\.(md|mdx)$/, '').split('/');
      if (parts.length < 3 || parts.some((part) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part))) {
        throw new Error(`${file}: use language/course/ASCII-slug paths`);
      }
      const isIndex = parts.length === 3 && name === 'index';
      if ((data.kind === 'course') !== isIndex) throw new Error(`${file}: only course/index may have kind: course`);
      if (!ordered || !meta.pages.includes(name)) throw new Error(`${file}: content missing from explicit directory order`);
      const slug = isIndex ? [] : parts.slice(2);
      const publicSlug = isIndex ? '' : slug[slug.length - 1];
      const url = `/${locale}/courses/${parts[1]}${publicSlug ? `/${publicSlug}` : ''}`;
      const { headings, links } = inspectMarkdown(parsed.content, file);
      documents.push({ file: relative(root, file), locale, courseSlug: parts[1], slug, url, data, body: parsed.content, headings, links, stale: false, sourceUrl: '' });
    }
    for (const page of meta.pages) {
      const entry = byName.get(page)!;
      if (entry.isDirectory()) walk(join(dir, entry.name), locale, ordered);
      else if (ordered) order.get(locale)!.push(relative(root, join(dir, entry.name)));
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
