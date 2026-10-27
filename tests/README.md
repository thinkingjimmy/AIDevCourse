# tests/

> L2 | Parent: [../README.md](../README.md)

Shared test configuration lives here. Generated reports and attachments stay in Git-ignored `.artifacts/e2e/<mode>/`. Run all commands from the repository root; content fixtures never enter a deployment build.

- `playwright.config.ts`: Browser projects, owned server, and separate public/fixture evidence.
- `vitest.config.ts`: Existing unit test discovery.
- [unit/](./unit/README.md): Pure content, locale, progress, redirect, and search tests; run `pnpm test`.
- [e2e/](./e2e/README.md): Production-server browser tests; run `pnpm test:e2e` after `pnpm build`.
- [fixtures/](./fixtures/README.md): Five-language course fixtures; use `CONTENT_TEST=1` for both build and E2E.

[PROTOCOL]: Update this header when making changes, then check README.md.
