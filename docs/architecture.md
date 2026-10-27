# Architecture

> L2 | Parent: [README.md](./README.md)

The site uses Next.js App Router, React, Fumadocs MDX, next-intl, and Tailwind CSS. Exact versions live in `package.json` and `pnpm-lock.yaml`. Use Node 22.17.0 or a later 22.x patch and pnpm 10.30.3. The runtime needs no database or external content service.

## Module boundaries

| Module | Responsibility |
| --- | --- |
| [app](../src/app/README.md) | Compose routes, static metadata, locale providers, and public search responses. |
| [components](../src/components/README.md) | Keep course, layout, MDX, progress, search, and illustration behavior together by purpose. |
| [content](../src/lib/content/README.md) | Scan, validate, compile, and query the published catalog. |
| [i18n](../src/lib/i18n/README.md) | Supported languages, preference negotiation, dictionaries, and URL parsing. |
| [lib](../src/lib/README.md) | Small shared progress, search, metadata, redirect, and utility modules. |
| [styles](../src/styles/README.md) | Shared tokens, reading layout, and content styles. |

Routes compose components and query server content. Browser components receive serializable catalog data; they must not import the filesystem scanner or compiled server modules. Course-only controls stay in `components/course`. Shared UI primitives stay in `components/ui`; dialogs share `ui/overlays`. The two hero illustrations share an animation driver while retaining their own markup and timing.

Avoid single-file directory layers and unused generic APIs. A directory is useful when it owns a coherent group of files. Source files stay within 800 lines; each directory has at most eight maintained files. Directory READMEs describe membership, and source headers describe inputs, outputs, and responsibility.

## Content pipeline

1. Authors edit `content/{lang}` and explicitly order files in `meta.json`.
2. `scan.ts`, `schema.ts`, `mdx.ts`, and `validate.ts` check identity, metadata, ordering, the safe MDX subset, image dimensions, and rendered link destinations. Validation uses the same Fumadocs YAML parser as compilation.
3. The Fumadocs configuration writes compiled modules and a catalog into `.source/` for public content or `.source-test/` for fixtures.
4. `source.ts` exposes server queries; `manifest.ts` and `model.ts` define serializable courses, lessons, translation maps, and rendered anchors.
5. Routes, metadata, sitemap, and the search API consume the same published catalog.

The course overview renders frontmatter and the syllabus anchor `course-catalog`. Lesson pages render their body headings. Link validation and language switching use these rendered anchors. Course/module folders determine organization; public lesson URLs omit the module folder.

Body edits support development hot reload. Restart after frontmatter, filename, or ordering changes to refresh the generated catalog. Do not edit generated files by hand.

## Routing and client state

`src/proxy.ts` negotiates only known unprefixed entry routes and validates published paths. Missing pages use static unavailable documents with a 404 status. Changes to this adapter must verify HTML, client navigation, locale behavior, and reading without JavaScript.

Learning state uses `lac:v1:{courseId}:lesson:{lessonId}` storage keys. Stable IDs connect translations; current-language lessons determine counts. The progress provider synchronizes storage events and falls back to memory when storage is unavailable.

Search loads the active language's static index. Results belong to a specific query; pending queries cannot activate older results. The sidebar owns collapse and mobile navigation state, while lesson bodies remain server-rendered.

## Build and verification

Normal builds read `content/`, generate `.source/`, and write `.next`. `CONTENT_TEST=1` reads `tests/fixtures/`, generates `.source-test/`, and writes `.next-test`. `config/content-mode.mjs` keeps these paths together and rejects fixture mode on Vercel. Generated import aliases select the same mode for the catalog, route snapshot, and compiled MDX in both Turbopack and Webpack. TypeScript can inspect either generated tree; application builds never fall back between modes.

`pnpm check` verifies structure, documentation links, lint, types, content, dictionary parity, and existing unit checks. `pnpm audit --prod` checks current production dependency advisories; CI rejects high and critical findings. Run E2E only for affected modules during development. CI and release checks run the full public and fixture matrices in Chromium, Firefox, and WebKit.

Generated evidence stays in Git-ignored `.artifacts/`: browser reports and attachments in `e2e/{public,fixtures}`, structure checks and local reviews in `review`, Lighthouse output in `performance`, and optional screenshot references in `visual`. The performance script discovers available pages from a running server's sitemap. For one-page checks, set `PERFORMANCE_PATH` and `PERFORMANCE_RUNS`; local measurements are not field performance data.

See the [contribution guide](../.github/CONTRIBUTING.md), [authoring guide](./authoring.md), and [deployment guide](./deployment.md) for working procedures. Organization follows [Next.js project structure guidance](https://nextjs.org/docs/app/getting-started/project-structure); contributor files follow [GitHub community guidance](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories).

[PROTOCOL]: Update this header when making changes, then check README.md.
