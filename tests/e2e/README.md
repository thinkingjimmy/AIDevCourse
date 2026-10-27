# tests/e2e/

> L2 | Parent: [../README.md](../README.md)

- `site.spec.ts`: Public routing, homepage hero/header/catalog alignment, Fundamentals heading without a subtitle, menu-matched actions, course-card hover/focus depth and hidden chip callouts with desktop/mobile screenshots, empty states, SEO, accessibility, and no-JS reading.
- `learning.spec.ts`: Fixture learning progress, multilingual search, IME, and responsive reading.
- `navigation.spec.ts`: Brand identity across languages, aligned course heroes with home-matched actions and no summary statistics, metadata, image loading, responsive headers/sidebars, language menus, focus, persistence, and clipboard failures. Brand and course hero cases attach desktop and mobile screenshots.
- `styles.spec.ts`: Illustration motion, repeated homepage Mac hover cycles and interruption, whole-card chip hover/re-entry, reduced-motion behavior with video evidence, shared controls, failure states, and optional appearance comparisons.
- `components.spec.ts`: JimmyNote Markdown, accessibility, responsive layout, and no-JS rendering.
- `tables.spec.ts`: Semantic tables, narrow-screen scrolling, native container keyboard access, and no-JS rendering.
- `repository.spec.ts`: Real authoring CLI and deployment-guard checks, valid 404 recovery links, and search query isolation.

Run a production build before E2E. Use the same CONTENT_TEST setting for the build and tests. During development, select only changed modules or cases with --grep. Full matrices run in CI and before releases.

Reports are under .artifacts/e2e/public/report and .artifacts/e2e/fixtures/report. Every run also writes results.json; screenshots and traces are test attachments. Local appearance comparisons require VISUAL_TEST=1 and reviewed references under .artifacts/visual. CI excludes appearance comparisons.

[PROTOCOL]: Update this header when making changes, then check README.md.
