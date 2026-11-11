# Contributing

Questions, corrections, content, and code contributions are welcome. You do not need to write code to help improve the course. Use Chinese or English, and search existing Issues before opening a new one.

## Ask a question or suggest a correction

| Category | Use it for | Include |
| --- | --- | --- |
| [Question](https://github.com/thinkingjimmy/aidevcourse/issues/new?template=01-question.yml) | A lesson concept, learning difficulty, or project question | Your question and the page, if applicable |
| [Correction](https://github.com/thinkingjimmy/aidevcourse/issues/new?template=02-correction.yml) | A typo or inaccurate explanation | The page and the relevant passage; a proposed correction or reference is optional |

These forms apply the `question` and `correction` labels. Browse [existing questions](https://github.com/thinkingjimmy/aidevcourse/issues?q=is%3Aissue%20label%3Aquestion) and [existing corrections](https://github.com/thinkingjimmy/aidevcourse/issues?q=is%3Aissue%20label%3Acorrection). For other suggestions or reproducible site problems, use [a general Issue](https://github.com/thinkingjimmy/aidevcourse/issues/new/choose). Include expected behavior, actual behavior, and steps to reproduce a site problem.

Discuss a feature in an Issue before starting a large change. Follow the [security policy](./SECURITY.md) for sensitive reports.

## Setup

Use Node **24.x** and pnpm **10.30.3**. CI and production use Node 24.x.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000/zh](http://localhost:3000/zh). No database, model API key, or translation service is required. Never commit `.env` files, API keys, dependencies, build output, or generated test evidence.

Development also accepts this computer's current IPv4 addresses, so local-network previews can load client resources and hot reload. Other origins remain blocked.

Development uses Turbopack with a persistent disk cache. Articles compile on demand; the homepage and course directories read the validated catalog without loading article bodies. Unchanged content reuses its validation result. Development enables memory eviction after cache snapshots and garbage collection for unused compiler work. Body edits and achievement declarations support hot reload. Restart after changing frontmatter, file paths, or `meta.json` order. Fonts are installed through pinned Fontsource packages; development and builds do not download fonts from Google.

English routes have no language prefix. Other languages use `/zh`, `/ja`, `/fr`, and `/es`. Design studies are at `/design`, and writing components are at `/design/components`. The design and animation dictionaries start at `/vocabulary/typography` and `/animation-vocabulary/entrances-and-exits`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Turbopack development server |
| `pnpm check` | Check structure, documentation links, lint, types, content, dictionaries, and existing unit tests |
| `pnpm audit --prod` | Check production dependencies against current advisories |
| `pnpm build` | Validate and build published courses |
| `pnpm start` | Serve the production build |
| `pnpm test:e2e tests/e2e/navigation.spec.ts --project=chromium` | Check the affected navigation module after a build |
| `pnpm test:e2e:report` | Open the public-build HTML test report |
| `pnpm measure:performance` | Measure a server running on port 3200; discover pages from its sitemap |
| `pnpm measure:startup` | Measure isolated cold starts, restarts, and dev-process memory; save logs and JSON under `.artifacts/performance/dev-startup/` |

Install browser binaries with `pnpm exec playwright install chromium firefox webkit` before running browser checks.

## Make a change

- Follow the existing TypeScript and React conventions. Use English for code, comments, and commit messages.
- Keep routes focused on composition. Put shared behavior in the smallest existing module that owns it.
- Add an abstraction when it removes actual duplication. Remove unused code instead of keeping speculative interfaces.
- Keep source files below 800 lines and each directory at eight maintained files or fewer. Keep the root for discoverable project files.
- Update relevant setup, architecture, or authoring guidance when behavior changes.
- Keep keyboard access, native links, narrow-screen reading, reduced motion, and storage failure behavior intact.
- Preserve tutorial wording unless the change explicitly addresses that content. Keep unrelated content corrections in their own Issue or pull request.
- Use the [authoring guide](../docs/authoring.md) for content changes. Translate interface messages in all five dictionaries. Preserve stable course and lesson IDs.
- Submit only content and artwork you have permission to distribute under the repository license.

The [architecture guide](../docs/architecture.md) explains module boundaries. The [requirements](../docs/requirements.md) describe current product behavior. See the [deployment guide](../docs/deployment.md) for publishing, environment settings, and rollback.

## Validate

Write failure cases before changing isolated domain behavior. Prefer browser or CLI integration checks for new behavior. Do not add unit tests after implementation; retain and run the existing checks.

Run `pnpm check` and `pnpm build`. Then run only E2E cases for the modules changed, for example:

```bash
pnpm test:e2e tests/e2e/navigation.spec.ts --project=chromium
```

Lesson interactions need the isolated fixture build:

```bash
CONTENT_TEST=1 pnpm build
CONTENT_TEST=1 pnpm test:e2e tests/e2e/navigation.spec.ts --project=chromium
```

Both commands in the fixture pair need the same environment. The assignment above uses POSIX shell syntax. In PowerShell, set `$env:CONTENT_TEST = '1'` before the fixture commands and remove it afterwards. Public courses build to `.next`; fixtures build to `.next-test`. Never deploy fixtures.

E2E starts its own server on port **3310**; set `E2E_PORT` if needed. Repeatable reports, traces, and screenshots go to `.artifacts/e2e/public/` or `.artifacts/e2e/fixtures/`. Measurements and other generated evidence also stay in Git-ignored `.artifacts/`. Attach relevant screenshots or logs to your PR. Find browser cases in [tests/e2e](../tests/e2e/).

Use `CONTENT_TEST=1 E2E_DEV=1 pnpm test:e2e tests/e2e/development/content.spec.ts --project=chromium --workers=1` to check development content refresh and cache invalidation. These checks temporarily edit fixture content and create a temporary image; they restore both. Development E2E evidence uses the `dev-public` and `dev-fixtures` report directories.

`pnpm measure:startup` creates a temporary `dev-profile-*` directory, shares installed dependencies, and starts its own local server. It moves the source copy into its report directory when finished. It does not stop an existing server or change its cache. Set `STARTUP_RUNS` (1–10), `STARTUP_LABEL`, or `STARTUP_IDLE_MS` (1000–60000) to change the measurements; use `STARTUP_SOURCE` to compare another checkout or a previous source snapshot. Reported memory sums RSS for the dev process tree, so shared pages can be counted more than once. Keep `.next/dev` between normal sessions to reuse the disk cache.

During development, run only E2E cases for the changed modules. CI and release checks run the complete public and fixture matrices in Chromium, Firefox, and WebKit. Before a release, run:

```bash
pnpm check
pnpm build
pnpm test:e2e
CONTENT_TEST=1 pnpm build
CONTENT_TEST=1 pnpm test:e2e
```

For dependency changes, run `pnpm audit --prod` and verify a frozen-lockfile install. CI rejects high or critical production advisories.

## Submit a pull request

Explain the problem and resulting behavior. List commands actually run and any checks still pending. Add screenshots for visible changes. Keep unrelated cleanup separate. Use a clear title and a ready-for-review PR when the work is complete.

Be respectful and specific in reviews. Discuss behavior and code. Do not post private information, harassment, or personal attacks. Maintainers may close contributions that do not follow these expectations.
