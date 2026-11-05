# AIDevCourse

A multilingual learning site for local Markdown and MDX courses.

**English** · [简体中文](./docs/README.zh.md)

Next.js 16.3.8 + React 19.3.0 + Fumadocs MDX 15.4.3 / Core & UI 16.15.13 + next-intl 4.14.6 + Tailwind CSS 4.3.3 + KaTeX 0.19.1 + Glisse 0.5.0

Authors declare single-choice achievements directly in MDX; validation builds each course’s achievement inventory from its original articles.

Mermaid code fences render as SVG through Pele, with accessible titles and descriptions, keyboard scrolling for wide diagrams, and no browser diagram engine.

Read courses in five languages, search the current language, and keep earned achievements and your last lesson in your browser. No account, database, model API key, or translation service is required.

Hover or focus Markdown page links to preview their title, summary, domain, and available cover. Local previews use the course catalog; optional external previews read public metadata on demand and keep navigation available when metadata cannot load.

**Content status:** LLM 101 has introductions in five languages. Its fourteen Chinese lessons form three modules: 大语言模型的工作原理 (`model-fundamentals`, four lessons on generation, tokens, sampling, and probabilities), 模型的训练与能力 (`model-training`, five lessons on pretraining, thinking, multimodal inputs, open models and local deployment, and model selection), and AI 应用的工作原理 (`ai-applications`, five lessons on chat history as model input, tool calling, effective Chat use, interactive artifacts, and Agent basics). Other languages retain the first lesson's welcome placeholder in `model-fundamentals`. Lesson URLs and achievement identities stay unchanged when files move between modules. LLM 101 remains a beginner course without post-training lessons; Chat practice belongs beside the corresponding application concepts. The [authoring guide](./docs/authoring.md#llm-101-的课程范围) records future topics and the intermediate Agent 101 boundary. Agent 101 has a Chinese homepage card and course overview with intermediate difficulty; its lessons are being prepared. The Agent introduction is the final LLM 101 lesson. The Macintosh homepage groups course disks under Getting started and difficulty levels, with up to nine disks per page; empty groups stay hidden. The Chinese introduction 从想法到作品 has a disk and independent overview under 起步, with lessons grouped under 学前必看 and 关于本网站, in that order. 关于这门课 belongs to 关于本网站 and introduces the audience, learning route, and starting point. Design 101 (设计 101) has a Chinese beginner disk and overview; its lessons are being prepared. The Chinese catalog shows LLM 101, Coding 101, and 设计 101 under 入门, and Agent 101 under 中级. The homepage learning action opens the introductory course overview. Disk clicks insert into the Macintosh before opening the independent course directory; lessons retain their left navigation sidebar. Keyboard, reduced-motion, and no-JavaScript navigation keep native links. Coding 101 is available in Chinese, with three beginner lessons on JSON basics, calling an AI API, and animation prompts. It includes optional curl practice, two achievements, and six replayable animation examples with copyable prompts. Engineering fixtures remain separate from published courses.

## Quick start

Use Node **22.17.0 or a later 22.x patch**, or **24.x**, and pnpm **10.30.3**. CI and production remain on Node 22.x.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000/zh](http://localhost:3000/zh). Body edits and achievement declarations support hot reload; development validates current article definitions and course achievement inventories together. Restart after changing frontmatter, file paths, or `meta.json` order.

`pnpm dev` uses Webpack with an in-memory development cache to avoid missing CSS chunks and unsupported dependency tracing. Geist, Geist Mono, Geist Pixel, and the Chinese/Japanese Noto fonts are installed as pinned Fontsource packages; development and builds do not download fonts from Google. Unicode ranges keep CJK font requests limited to the glyphs used on the page. Restart a running development server after changing this command, then reload the browser once. Optional external previews retry proxy-generated DNS addresses through Cloudflare's HTTPS resolver; pages that reject metadata reads return an empty preview response and keep normal navigation.

English uses `/`, `/about`, and `/courses/...`; other languages use `/zh`, `/ja`, `/fr`, and `/es` prefixes. Only `/` detects saved/browser language preferences, with English as the fallback. Design studies are available at `/design`; writing components are at `/design/components`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Webpack development server |
| `pnpm check` | Structure, lint, types, content, dictionaries, and existing unit checks |
| `pnpm audit --prod` | Check production dependencies against current advisories |
| `pnpm build` | Validate and build published courses |
| `pnpm start` | Serve the production build |
| `pnpm test:e2e tests/e2e/navigation.spec.ts --project=chromium` | Check the affected navigation module after a build |
| `pnpm test:e2e:report` | Open the public-build HTML test report |
| `pnpm measure:performance` | Measure a server running on port 3200; discover pages from its sitemap |

Install browser binaries with `pnpm exec playwright install chromium firefox webkit`. During development, run only E2E cases for the changed modules. Before a release, run both complete browser matrices:

```bash
pnpm check
pnpm build
pnpm test:e2e
CONTENT_TEST=1 pnpm build
CONTENT_TEST=1 pnpm test:e2e
```

The environment assignment above uses POSIX shell syntax. In PowerShell, set `$env:CONTENT_TEST = '1'` before the fixture commands and remove it afterwards.

E2E starts its own server on port **3310**; set `E2E_PORT` if needed. Fixture builds use `.next-test` and cannot deploy to Vercel. Reports, traces, screenshots, and measurements stay in Git-ignored `.artifacts/`; public and fixture reports have separate directories.

## Repository map

| Directory | Responsibility |
| --- | --- |
| [`src/`](./src/) | Routes, components, domain logic, dictionaries, and styles |
| [`content/`](./content/) | Published courses, organized by language |
| [`config/`](./config/) | MDX collection, lint rules, redirects, and environment example |
| [`tests/`](./tests/) | Browser checks, existing unit checks, and isolated content fixtures |
| [`scripts/`](./scripts/) | Content validation, dictionary validation, and performance measurement |
| [`public/`](./public/) | Official logo and icons, course images, and brand candidates |
| [`docs/`](./docs/) | Current requirements, architecture, authoring, deployment, and templates |
| [`.github/`](./.github/) | CI and contribution guidance |

- `package.json`: Runtime constraints, pinned dependencies, scripts, license, and PostCSS settings.
- `pnpm-lock.yaml`: Reproducible dependency resolution.
- `next.config.mjs`: Framework integrations, deployment guards, and response headers.
- `tsconfig.json`: TypeScript configuration and source aliases.
- `components.json`: Local shadcn component settings and Phosphor icon choice.
- `.gitignore`: Excludes secrets, dependencies, caches, and generated evidence.
- `LICENSE`: MIT license.

Routes compose components. `src/lib/content` owns publication and content identities; `src/lib/i18n` owns language rules. Small shared domains use direct files in `src/lib`. UI primitives use direct files in `src/components/ui`, with dialogs in `overlays`. The course sidebar stays with course components. Homepage disks and course covers share one component; the disk transition uses native browser animations.

Maintained source files stay below 800 lines, and each directory contains at most eight maintained files.

## Contributing and deployment

Start with the [contribution guide](./.github/CONTRIBUTING.md). Report reproducible problems through [GitHub issues](https://github.com/thinkingjimmy/aidevcourse/issues); follow the [security policy](./.github/SECURITY.md) for sensitive reports.

The [requirements](./docs/requirements.md) define current behavior; the [architecture guide](./docs/architecture.md) explains module boundaries and data flow. The [authoring guide](./docs/authoring.md) covers course IDs, translations, and supported MDX. The [deployment guide](./docs/deployment.md) covers `SITE_URL`, release checks, and rollback. Authoring and deployment guides use Chinese.

Use a verified HTTPS origin for production. Local environment examples are in `config/.env.example`. Preview deployments use `noindex`. Course translations share achievements by stable IDs; unavailable translations link to an available course or the language homepage. Reading remains available when storage fails.

Licensed under [MIT](./LICENSE).
