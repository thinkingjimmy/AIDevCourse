# AIDevCourse

A multilingual learning site for local Markdown and MDX courses.

**English** · [简体中文](./docs/README.zh.md)

Next.js 16.3.8 + React 19.3.0 + Fumadocs MDX 15.4.3 / Core & UI 16.15.13 + next-intl 4.14.6 + Tailwind CSS 4.3.3

Authors declare single-choice achievements directly in MDX; validation builds each course’s achievement inventory from its original articles.

Read courses in five languages, search the current language, and keep earned achievements and your last lesson in your browser. No account, database, model API key, or translation service is required.

**Content status:** AI 101 has introductions in five languages. The Chinese What a language model does lesson explains LLM generation and input quality with interactive examples; the other languages retain welcome placeholders. The homepage learning action opens this first lesson. Engineering fixtures remain separate from published courses.

## Quick start

Use Node **22.17.0 or a later 22.x patch** and pnpm **10.30.3**.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000/zh](http://localhost:3000/zh). Body edits support hot reload. Restart after changing frontmatter, achievement declarations, file paths, or `meta.json` order.

English uses `/`, `/about`, and `/courses/...`; other languages use `/zh`, `/ja`, `/fr`, and `/es` prefixes. Only `/` detects saved/browser language preferences, with English as the fallback. Design studies are available at `/design`; writing components are at `/design/components`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
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

<directory>

| Directory | Responsibility |
| --- | --- |
| [`src/`](./src/README.md) | Routes, components, domain logic, dictionaries, and styles |
| [`content/`](./content/README.md) | Published courses, organized by language |
| [`config/`](./config/README.md) | MDX collection, lint rules, redirects, and environment example |
| [`tests/`](./tests/README.md) | Browser checks, existing unit checks, and isolated content fixtures |
| [`scripts/`](./scripts/README.md) | Content validation, dictionary validation, and performance measurement |
| [`public/`](./public/README.md) | Official logo and icons, course images, and brand candidates |
| [`docs/`](./docs/README.md) | Current requirements, architecture, authoring, deployment, and templates |
| [`.github/`](./.github/README.md) | CI and contribution guidance |

</directory>

<config>

- `package.json`: Runtime constraints, pinned dependencies, scripts, license, and PostCSS settings.
- `pnpm-lock.yaml`: Reproducible dependency resolution.
- `next.config.mjs`: Framework integrations, deployment guards, and response headers.
- `tsconfig.json`: TypeScript configuration and source aliases.
- `components.json`: Local shadcn component settings and Phosphor icon choice.
- `.gitignore`: Excludes secrets, dependencies, caches, and generated evidence.
- `LICENSE`: MIT license.

</config>

Routes compose components. `src/lib/content` owns publication and content identities; `src/lib/i18n` owns language rules. Small shared domains use direct files in `src/lib`. UI primitives use direct files in `src/components/ui`, with dialogs in `overlays`. The course sidebar stays with course components. Both hero illustrations share one animation driver.

Directory READMEs list their members. Source headers describe inputs, exports, and responsibility. Keep those maps current when changing code. Maintained source files stay below 800 lines, and each directory contains at most eight maintained files.

## Contributing and deployment

Start with the [contribution guide](./.github/CONTRIBUTING.md). Report reproducible problems through [GitHub issues](https://github.com/thinkingjimmy/aidevcourse/issues); follow the [security policy](./.github/SECURITY.md) for sensitive reports.

The [requirements](./docs/requirements.md) define current behavior; the [architecture guide](./docs/architecture.md) explains module boundaries and data flow. The [authoring guide](./docs/authoring.md) covers course IDs, translations, and supported MDX. The [deployment guide](./docs/deployment.md) covers `SITE_URL`, release checks, and rollback. Authoring and deployment guides use Chinese.

Use a verified HTTPS origin for production. Local environment examples are in `config/.env.example`. Preview deployments use `noindex`. Course translations share achievements by stable IDs; unavailable translations link to an available course or the language homepage. Reading remains available when storage fails.

Licensed under [MIT](./LICENSE).

[PROTOCOL]: Update this header when making changes, then check README.md.
