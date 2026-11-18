import type { ProgrammingTermId } from './programming';

type ArticleTermId = Exclude<ProgrammingTermId, 'static-website'>;

export type ProgrammingArticle = {
  code: { language: string; source: string };
  steps: readonly string[];
  points: readonly string[];
  rows: readonly string[];
  uses: readonly string[];
  misconceptions: readonly string[];
  links: readonly { id: string; href: string }[];
};

const gitBook = 'https://git-scm.com/book/en/v2';
const nodeDocs = 'https://nodejs.org/docs/latest/api/';
const nextDocs = 'https://nextjs.org/docs';
const vercelDocs = 'https://vercel.com/docs';
const supabaseDocs = 'https://supabase.com/docs';
const cloudflareDocs = 'https://developers.cloudflare.com/';

export const programmingArticles: Record<ArticleTermId, ProgrammingArticle> = {
  git: {
    code: {
      language: 'bash',
      source: 'git init\ngit add index.html\ngit commit -m "Add homepage"',
    },
    steps: ['init', 'stage', 'commit', 'branch'],
    points: ['repo', 'snapshot', 'history'],
    rows: ['stores', 'restore', 'team'],
    uses: ['personal', 'team', 'open-source'],
    misconceptions: ['github', 'upload', 'branch-weight'],
    links: [
      { id: 'book', href: `${gitBook}/Getting-Started-What-is-Git%3F` },
      { id: 'docs', href: 'https://git-scm.com/docs' },
      { id: 'github', href: 'https://docs.github.com/en/get-started/start-your-journey/about-github-and-git' },
      { id: 'branching', href: `${gitBook}/Git-Branching-Branches-in-a-Nutshell` },
    ],
  },
  'node-js': {
    code: {
      language: 'javascript',
      source: "import { createServer } from 'node:http';\n\nconst server = createServer((request, response) => {\n  response.end('Hello from Node.js');\n});\n\nserver.listen(3000);",
    },
    steps: ['write', 'run', 'capabilities', 'serve'],
    points: ['file', 'run', 'result'],
    rows: ['where', 'can', 'cannot'],
    uses: ['backend', 'cli', 'tooling'],
    misconceptions: ['language', 'browser', 'framework'],
    links: [
      { id: 'intro', href: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs' },
      { id: 'about', href: 'https://nodejs.org/en/about' },
      { id: 'docs', href: nodeDocs },
      { id: 'http', href: 'https://nodejs.org/api/http.html' },
    ],
  },
  'next-js': {
    code: {
      language: 'tsx',
      source: '// app/page.tsx\nexport default function HomePage() {\n  return <h1>Hello, Next.js!</h1>;\n}',
    },
    steps: ['create', 'page', 'render', 'build'],
    points: ['file', 'route', 'result'],
    rows: ['routing', 'rendering', 'build'],
    uses: ['content', 'seo', 'fullstack'],
    misconceptions: ['react-replacement', 'always-fast', 'vercel-only'],
    links: [
      { id: 'docs', href: nextDocs },
      { id: 'learn', href: 'https://nextjs.org/learn' },
      { id: 'rendering', href: 'https://nextjs.org/docs/app/getting-started/server-and-client-components' },
      { id: 'react', href: 'https://react.dev/learn' },
    ],
  },
  vercel: {
    code: {
      language: 'bash',
      source: 'npm install -g vercel\nvercel\nvercel --prod',
    },
    steps: ['connect', 'push', 'build', 'serve'],
    points: ['install', 'preview', 'production'],
    rows: ['deploy', 'ops', 'control'],
    uses: ['nextjs', 'preview', 'static'],
    misconceptions: ['next-only', 'git-host', 'secrets'],
    links: [
      { id: 'docs', href: vercelDocs },
      { id: 'deployments', href: 'https://vercel.com/docs/deployments' },
      { id: 'nextjs', href: 'https://vercel.com/docs/frameworks/full-stack/nextjs' },
      { id: 'env', href: 'https://vercel.com/docs/environment-variables' },
    ],
  },
  cloudflare: {
    code: {
      language: 'bash',
      source: 'curl -I https://example.com\n\n# Check the response headers:\n# server: cloudflare\n# cf-cache-status: HIT',
    },
    steps: ['nameserver', 'edge', 'cache', 'protect'],
    points: ['dns', 'headers', 'cache'],
    rows: ['distance', 'protection', 'cache'],
    uses: ['cdn', 'dns', 'protection'],
    misconceptions: ['hosting', 'always-fast', 'replace-server'],
    links: [
      { id: 'how', href: `${cloudflareDocs}fundamentals/concepts/how-cloudflare-works/` },
      { id: 'dns', href: `${cloudflareDocs}dns/` },
      { id: 'cache', href: `${cloudflareDocs}cache/` },
      { id: 'workers', href: `${cloudflareDocs}workers/` },
    ],
  },
  supabase: {
    code: {
      language: 'typescript',
      source: "import { createClient } from '@supabase/supabase-js';\n\nconst supabase = createClient(projectUrl, publishableKey);\n\nconst { data, error } = await supabase\n  .from('notes')\n  .select('*');",
    },
    steps: ['project', 'schema', 'query', 'auth'],
    points: ['client', 'query', 'result'],
    rows: ['database', 'auth', 'ops'],
    uses: ['prototype', 'team', 'realtime'],
    misconceptions: ['just-database', 'anon-key', 'small-only'],
    links: [
      { id: 'docs', href: supabaseDocs },
      { id: 'database', href: 'https://supabase.com/docs/guides/database/overview' },
      { id: 'auth', href: 'https://supabase.com/docs/guides/auth' },
      { id: 'rls', href: 'https://supabase.com/docs/guides/database/postgres/row-level-security' },
    ],
  },
};

export function programmingArticle(id: string) {
  return id in programmingArticles ? programmingArticles[id as ArticleTermId] : undefined;
}
