/**
 * [INPUT]: Tracked and non-ignored repository files and their module documentation.
 * [OUTPUT]: Actionable structure errors and a repeatable .artifacts/review/structure.json report.
 * [POS]: Repository maintenance gate for file limits, source contracts, and documentation links.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0'))]
  .filter((file) => file && existsSync(file) && statSync(file).isFile()).sort();
const directories = new Map<string, string[]>();
const issues: string[] = [];
const sourceExtensions = new Set(['.ts', '.tsx', '.mjs', '.css', '.yml']);
const protocol = '[PROTOCOL]: Update this header when making changes, then check README.md.';
let sourceLines = 0;
for (const file of files) {
  const parent = dirname(file);
  const members = directories.get(parent) ?? [];
  members.push(file);
  directories.set(parent, members);
  if (sourceExtensions.has(extname(file))) {
    const source = readFileSync(file, 'utf8');
    const lines = source.trimEnd().split('\n').length;
    sourceLines += lines;
    if (lines > 800) issues.push(`${file}: ${lines} lines; maximum is 800`);
    if (!source.slice(0, 1500).includes(protocol) || !['[INPUT]:', '[OUTPUT]:', '[POS]:'].every((field) => source.slice(0, 1500).includes(field))) {
      issues.push(`${file}: missing source contract`);
    }
  }
  if (extname(file) !== '.md') continue;
  const markdown = readFileSync(file, 'utf8');
  if (!markdown.includes(protocol)) issues.push(`${file}: missing protocol`);
  const prose = markdown.replace(/```[\s\S]*?```/g, '');
  for (const match of prose.matchAll(/\]\(([^)]+)\)/g)) {
    const link = match[1].split('#')[0];
    if (!link || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(link)) continue;
    if (!existsSync(resolve(parent, link))) issues.push(`${file}: missing link target ${link}`);
  }
}
for (const [directory, members] of directories) {
  if (members.length > 8) issues.push(`${directory}: ${members.length} maintained files; maximum is 8`);
  if (!existsSync(resolve(directory, 'README.md'))) issues.push(`${directory}: missing README.md`);
}
const report = { files: files.length, directories: directories.size, sourceLines, issues };
mkdirSync('.artifacts/review', { recursive: true });
writeFileSync('.artifacts/review/structure.json', `${JSON.stringify(report, null, 2)}\n`);
if (issues.length) {
  issues.forEach((issue) => console.error(issue));
  process.exitCode = 1;
} else console.log(`Repository structure passed: ${files.length} files, ${directories.size} directories.`);
