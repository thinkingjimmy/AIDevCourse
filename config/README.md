# config/

> L2 | Parent: [../README.md](../README.md)

Build and publication settings. TypeScript uses the root `tsconfig.json`; each test suite owns its configuration. PostCSS plugins are declared in `package.json`.

- `.env.example`: Production-origin environment reference.
- `eslint.config.mjs`: Next.js, TypeScript, and accessibility lint rules, loaded by `pnpm lint`.
- `redirects.json`: Reviewed one-hop URL migrations; currently empty.
- `source.config.ts`: Validated Fumadocs collection, frozen public catalog/routes, and code highlighting.

[PROTOCOL]: Update this header when making changes, then check README.md.
