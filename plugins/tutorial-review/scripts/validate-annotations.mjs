import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTutorial } from '../src/render.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '../../..');
const annRoot = resolve(scriptDir, '../annotations/zh');
const allowed = new Set(['表述过宽','因果简化','概念混用','缺少前提','数据待核','类比局限','绝对化','术语不准']);
let files = [];
function walk(dir) { for (const name of readdirSync(dir)) { const p = join(dir,name); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.json')) files.push(p); } }
walk(annRoot);
let total = 0, errors = 0;
for (const file of files.sort()) {
  const lesson = relative(annRoot, file).replace(/\.json$/, '').replace(/\\/g,'/');
  const source = readFileSync(join(root,'content/zh',lesson + '.mdx'),'utf8');
  const data = JSON.parse(readFileSync(file,'utf8'));
  const { html, error } = renderTutorial(source, { lessonId: lesson });
  if (error) { console.log('RENDER ERROR', lesson); errors++; continue; }
  const text = decode(stripTags(html));
  const norm = normalize(text);
  if (data.path !== lesson) { console.log('PATH MISMATCH', file, data.path, lesson); errors++; }
  const ids = new Set();
  for (const a of data.annotations || []) {
    total++;
    if (ids.has(a.id)) { console.log('DUP ID', lesson, a.id); errors++; }
    ids.add(a.id);
    if (!allowed.has(a.category)) { console.log('BAD CAT', lesson, a.id, a.category); errors++; }
    if (typeof a.comment !== 'string' || a.comment.length < 60 || a.comment.length > 220) { console.log('BAD COMMENT LEN', lesson, a.id, a.comment?.length); errors++; }
    const q = normalize(a.quote);
    if (q.length < 10 || q.length > 100) { console.log('BAD QUOTE LEN', lesson, a.id, q.length); errors++; }
    const count = countOccurrences(norm, q);
    if (count !== 1) { console.log('QUOTE COUNT', lesson, a.id, count, JSON.stringify(a.quote)); errors++; }
  }
  console.log(`${lesson}: ${(data.annotations||[]).length}`);
}
console.log({ files: files.length, total, errors });
function stripTags(html) { return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' '); }
function decode(s) { return s.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'"); }
function normalize(s) { return s.replace(/\s+/g,' ').trim(); }
function countOccurrences(haystack, needle) { if (!needle) return 0; let count=0, i=0; while ((i=haystack.indexOf(needle,i)) !== -1) { count++; i += needle.length; } return count; }
