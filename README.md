# Learning AI Coding — AI coding lessons, written locally

**English** · [简体中文](./README.zh.md)

Next.js 16.3.6 + React 19.3.0 + Fumadocs MDX 15.4.3 / Core & UI 16.15.13 + next-intl 4.14.6 + Tailwind CSS 4.3.3

A five-language learning site with local Markdown / MDX courses, language-specific search, and learning progress stored in your browser. The interface uses warm paper colors, full-height grid rails, Newsreader and IBM Plex Mono (self-hosted via `next/font`), and restrained retro details. No accounts, database, model API keys, or translation service are required.

**Current status:** the application is implemented. The public course is AI 101 (`ai-101`): six modules and 31 lessons. Chinese is the source. English has full text for the finished lessons and drafts for the rest. Japanese, French, and Spanish publish titles and summaries. Old `/ai-coding` URLs redirect to `/ai-101`. Device checks and deployment remain pending; see the [PRD and todo](./docs/PRD.md#13-markdown-开发任务).

## Quick start

Use Node **22.17.0** and pnpm **10.30.3**.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000/zh](http://localhost:3000/zh). Restart after changing frontmatter, file structure, or `meta.json` order. Body edits support hot reload.

Homepage studies, which do not replace `/zh`, are at [/design/a](http://localhost:3000/design/a) (catalog), [/design/b](http://localhost:3000/design/b) (course page), and [/design/c](http://localhost:3000/design/c) (studio). They read the published course in `content/zh/ai-101`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local site with the public courses |
| `pnpm check` | Run lint, TypeScript, content, dictionary, and unit checks |
| `pnpm build` | Validate content and dictionaries, then build for production |
| `pnpm start` | Serve the production build |
| `pnpm test:e2e` | Test the production build in Chromium, Firefox, and WebKit |

Install the test browsers once, then validate both publication modes:

```bash
pnpm exec playwright install chromium firefox webkit
pnpm check
pnpm build
pnpm test:e2e
CONTENT_TEST=1 pnpm build
CONTENT_TEST=1 pnpm test:e2e
```

E2E uses port **3310**; set `E2E_PORT` if needed. Test courses live in `tests/fixtures/<lang>/` and compile into `.next-test`. This test mode cannot deploy to Vercel. For performance measurements, run `CONTENT_TEST=1 pnpm start --port 3200` in another terminal, then `node scripts/measure-performance.mjs`.

## Repository map

<directory>

| Directory | Responsibility |
| --- | --- |
| [`src/`](./src/README.md) | Application code: `app`, `components`, `lib`, `messages`, and `styles` |
| [`content/`](./content/README.md) | Real course sources, organized directly by language: `en`, `zh`, `ja`, `fr`, `es` |
| [`config/`](./config/README.md) | MDX compilation, ESLint, environment reference, and URL redirects |
| [`tests/`](./tests/README.md) | `unit` and `e2e` suites with their configurations; isolated `fixtures` |
| [`scripts/`](./scripts/README.md) | Content checks, dictionary checks, and performance measurement |
| [`public/`](./public/README.md) | Public favicon and lesson images |
| [`docs/`](./docs/README.md) | PRD, authoring and deployment guides, templates, and validation evidence |
| [`.github/`](./.github/README.md) | Quality workflow for GitHub Actions |

</directory>

<config>

- `package.json` — pinned dependencies, runtime requirements, commands, and PostCSS configuration.
- `pnpm-lock.yaml` — reproducible dependency resolution.
- `next.config.mjs` — framework integrations, publication guards, and security headers.
- `tsconfig.json` — editor-discoverable TypeScript configuration and source aliases.
- `.gitignore` — excludes dependencies, local environment files, generated content, and build/test output.
- `README.md` / `README.zh.md` — English and Chinese project entry points; keep them in sync.
- `LICENSE` — project license.

</config>

Routes stay in `src/app`; UI components are grouped by responsibility in `src/components/{course,layout,mdx,progress,search}`; shared domain logic stays in `src/lib`. MDX rendering has one registry at `src/components/mdx/components.tsx`. Each directory README maps its members, and source headers describe their input, output, and role. Generated `.source` and `.next*` directories are not committed.

## Languages and learning data

The interface supports English (`/en`), Simplified Chinese (`/zh`), Japanese (`/ja`), French (`/fr`), and Spanish (`/es`). Explicit language URLs take priority. Unprefixed entry routes negotiate using the language cookie, `Accept-Language`, then `zh`; Chinese HTML and hreflang use `zh-Hans`.

Missing translations have explained fallback links; direct requests still return 404. Search downloads only the current language's index, on demand. Translations with the same `courseId` / `lessonId` share completion records, while counts and continue links use only lessons available in the current language. Progress stays in the current browser; reading remains available when storage fails.

## Authoring and deployment

The [documentation index](./docs/README.md) links to the [authoring guide](./docs/authoring.md), [deployment guide](./docs/deployment.md), and [implementation and validation notes](./docs/implementation-notes.md). These detailed guides are currently in Chinese.

Set `SITE_URL` to the verified production HTTPS origin; see `config/.env.example`. Vercel previews use `noindex` and serve the same courses as production. Vercel rejects test content. Deployment still requires the remaining gates recorded in the PRD.

Quiz, video embeds, interactive exercises, hint/solution controls, prompt comparisons, and other P1 features remain deferred until actual authoring needs justify them.

[PROTOCOL]: Update this header when making changes, then check README.md.
