# config/

> L2 | Parent: [../README.md](../README.md)

Build and publication settings. TypeScript uses the root `tsconfig.json`; test configurations live in tests/. PostCSS plugins are declared in `package.json`.

- `.env.example`: Production-origin environment reference.
- `content-mode.mjs`: Isolated public/fixture input, generated-source, and build paths; fixture deployment guard.
- `eslint.config.mjs`: Next.js, TypeScript, and accessibility lint rules, loaded by `pnpm lint`.
- `redirects.json`: Reviewed one-hop URL migrations; currently empty.
- `source.config.ts`: Validated Fumadocs collection, frozen canonical public catalog/routes with English prefixes omitted, design/component preview allowlist, and code highlighting.

[PROTOCOL]: Update this header when making changes, then check README.md.
