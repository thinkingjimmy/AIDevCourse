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
| [styles](../src/styles/README.md) | Shared Tailwind theme, typography scale, and @apply defaults for documents, Markdown, and SVG. |

Routes compose components and query server content. Browser components receive serializable catalog data; they must not import the filesystem scanner or compiled server modules. Course-only controls stay in `components/course`. Shared UI primitives stay in `components/ui`; dialogs share `ui/overlays`. The two hero illustrations share an animation driver while retaining their own markup and timing.

Avoid single-file directory layers and unused generic APIs. A directory is useful when it owns a coherent group of files. Source files stay within 800 lines; each directory has at most eight maintained files. Directory READMEs describe membership, and source headers describe inputs, outputs, and responsibility.

## Styling

Tailwind is the sole application styling system. Components use utilities; native document rules and generated Markdown/SVG selectors use @apply. The shared [typography contract](../src/styles/README.md) defines rem-based sizes, unitless leading, font weights, and responsive title roles. Public pages and design previews import the same theme. The cn helper registers custom typography names with tailwind-merge so overrides do not remove font sizes when applying colors. Structure validation rejects numeric arbitrary typography values and literal CSS typography declarations.

## Content pipeline

1. Authors edit `content/{lang}` and explicitly order files in `meta.json`. Course-root index files infer course kind; other article paths infer lesson kind. Authors provide stable lesson IDs, titles, descriptions, and course ownership, without duration, classification, or revision fields.
2. `scan.ts`, `schema.ts`, `mdx.ts`, and `validate.ts` check identity, metadata, ordering, the safe MDX subset, image dimensions, and rendered link destinations. Validation uses the same Fumadocs YAML parser as compilation.
3. The Fumadocs configuration writes compiled modules and a catalog into `.source/` for public content or `.source-test/` for fixtures.
4. `source.ts` exposes server queries; `manifest.ts` and `model.ts` define serializable courses, lessons, translation maps, and rendered anchors.
5. Routes, metadata, sitemap, and the search API consume the same published catalog.

The course overview renders frontmatter and the syllabus anchor `course-catalog`. Lesson pages render their body headings. Link validation and language switching use these rendered anchors. Course/module folders determine organization; public lesson URLs omit the module folder.

Body edits support development hot reload. Restart after frontmatter, filename, or ordering changes to refresh the generated catalog. Do not edit generated files by hand.

## Routing and client state

`src/lib/i18n/routing.ts` owns canonical paths: English has no prefix; the other languages retain one. The catalog, UI, metadata, sitemap, search filtering, and link validation share this rule. `src/proxy.ts` negotiates only `/`, preserves explicit native homepage language choices, rewrites canonical English URLs to internal `/en` App Router routes, and validates published paths. Direct `/en` URLs redirect permanently to their canonical address; article and About URLs never negotiate language. Missing pages use static unavailable documents with a 404 status. Changes to this adapter must verify HTML, client navigation, locale behavior, and reading without JavaScript.

Learning state uses `lac:v1:{courseId}:achievement:{achievementId}` records with an `unlockedAt` timestamp. The content scanner extracts static Achievement/AchievementOption declarations into article definitions. Publication validation rejects duplicate course achievement IDs and translated option/answer drift. Course manifests collect the source-language achievement IDs and lesson ownership; all translations receive the same inventory, including when a translated exercise is omitted. The server MDX registry binds the article definitions to the generic client challenge. LearningStorage accepts only manifest-registered IDs. The existing `generation-vs-verification` achievement remains owned by `ai-101:what-a-language-model-does` and retains its storage key; stable IDs share counts across translations. Recent visits retain `lac:v1:{courseId}:last` with `lessonId` and `visitedAt`. Legacy `lesson:` completion records remain untouched and do not count. LearningProvider synchronizes storage events and restores records before enabling unlocks. Answer feedback is local presentation state: an incorrect answer keeps retry enabled, while a correct answer immediately records the unlock and displays the earned title, takeaway, and retry action; explanations remain in incorrect feedback and the no-JavaScript fallback. An explicit local retry mode allows another attempt from the earned card without changing the saved unlock, its timestamp, or course statistics. Reloaded or remotely restored unlocks render the earned card directly. The adapter protects corrupt records and falls back to page memory when storage fails. Visiting never unlocks an achievement; the sidebar highlights the current route and its footer displays a medal ring plus the earned count. Its More dropdown reuses LanguageSubmenu and the same links as the native header language switcher.

Search loads the active language's static index. Results belong to a specific query; pending queries cannot activate older results. The sidebar owns collapse and mobile navigation state, while lesson bodies remain server-rendered.

## Build and verification

Normal builds read `content/`, generate `.source/`, and write `.next`. `CONTENT_TEST=1` reads `tests/fixtures/`, generates `.source-test/`, and writes `.next-test`. `config/content-mode.mjs` keeps these paths together and rejects fixture mode on Vercel. Generated import aliases select the same mode for the catalog, route snapshot, and compiled MDX in both Turbopack and Webpack. TypeScript can inspect either generated tree; application builds never fall back between modes.

`pnpm check` verifies structure, documentation links, lint, types, content, dictionary parity, and existing unit checks. `pnpm audit --prod` checks current production dependency advisories; CI rejects high and critical findings. Run E2E only for affected modules during development. CI and release checks run the full public and fixture matrices in Chromium, Firefox, and WebKit.

Generated evidence stays in Git-ignored `.artifacts/`: browser reports and attachments in `e2e/{public,fixtures}`, structure checks and local reviews in `review`, Lighthouse output in `performance`, and optional screenshot references in `visual`. The performance script discovers available pages from a running server's sitemap. For one-page checks, set `PERFORMANCE_PATH` and `PERFORMANCE_RUNS`; local measurements are not field performance data.

See the [contribution guide](../.github/CONTRIBUTING.md), [authoring guide](./authoring.md), and [deployment guide](./deployment.md) for working procedures. Organization follows [Next.js project structure guidance](https://nextjs.org/docs/app/getting-started/project-structure); contributor files follow [GitHub community guidance](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories).

[PROTOCOL]: Update this header when making changes, then check README.md.
