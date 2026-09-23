# tests/

> L2 | Parent: [../README.md](../README.md)

Test configuration stays with its suite. Run all commands from the repository root; content fixtures never enter a deployment build.

- [unit/](./unit/README.md): Vitest configuration and pure content, locale, progress, redirect, and search tests; run `pnpm test`.
- [e2e/](./e2e/README.md): Playwright configuration and production-server browser tests; run `pnpm test:e2e` after `pnpm build`.
- [fixtures/](./fixtures/README.md): Five-language course fixtures; use `CONTENT_TEST=1` for both build and E2E.

[PROTOCOL]: Update this header when making changes, then check README.md.
