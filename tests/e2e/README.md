# tests/e2e/

> L2 | Parent: [../README.md](../README.md)

playwright.config.ts: Three-browser matrix, production server, E2E_PORT, failure artifacts, and VISUAL_TEST opt-in for local screenshot comparisons. CI always excludes appearance tests. Both production and isolated fixture builds run shared component suites.

learning.spec.ts: Cross-language learning, explained translation fallbacks, visible-content search without hidden course-body anchors, keyboard navigation to a real lesson heading, and layout acceptance evidence. Each query waits for empty results before starting so a previous query cannot satisfy its assertions.

components.spec.ts: Real MDX JimmyNote previews at desktop, mobile, and narrow widths, rich Markdown, accessibility, no-JS links, and local screenshot artifacts.

tables.spec.ts: Chinese and English two/three-column Markdown previews at /design/components, zinc surfaces, preserved cell content, responsive overflow, keyboard scrolling, accessibility, no-JS reading, and local screenshot artifacts. These do not depend on published lessons. Run after a production build with `pnpm test:e2e tests/e2e/tables.spec.ts --project=chromium`.

navigation.spec.ts: Public course footers, globe menus, and keyboard-only search. Sidebar state/focus, mobile sheet, heading-link copying, and blocked storage/clipboard use isolated ai-coding fixtures. No baseline images are required.

site.spec.ts: Isolated language/viewport cases for responsive course cards, full-height image backgrounds, native card links, and empty course overviews. Cards omit chip leader lines and names; the course hero keeps them. HTTP publication, locale, SEO, no-JS, keyboard, and accessibility checks use native navigation between pages instead of interrupting prefetches with repeated hard loads.

styles.spec.ts: Hero motion in both builds. Shared controls, responsive boundaries, no-JS reading, and failure feedback use isolated lessons. Optional local Chromium comparisons cover public pages and design previews. References stay under `docs/evidence/screenshots/tailwind` and are ignored by Git.

Run `pnpm build`, then `pnpm test:e2e tests/e2e/navigation.spec.ts --project=chromium` for navigation changes, or `CONTENT_TEST=1 pnpm build` followed by `CONTENT_TEST=1 pnpm test:e2e tests/e2e/navigation.spec.ts tests/e2e/styles.spec.ts --project=chromium` for lesson controls. No screenshot references are required. To compare existing local references, run `VISUAL_TEST=1 pnpm test:e2e tests/e2e/styles.spec.ts --project=chromium`. Capture a new reference only after reviewing an intentional visual change, using the same opt-in with `--grep appearance --update-snapshots`. VISUAL_TEST does not enable appearance tests in CI.

[PROTOCOL]: Update this header when making changes, then check README.md.
