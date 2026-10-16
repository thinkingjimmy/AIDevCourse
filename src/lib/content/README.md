# src/lib/content/

> L2 | Parent: [../README.md](../README.md)

manifest.ts: One public catalog with localized manifests and translation maps.

mdx.ts: Allowlisted Callout, JimmyNote, Steps, and Step syntax, safe headings/references, and actionable authoring errors.

modules.ts: Module groups with 1.1-style indexes, and a short course breadcrumb label.

scan.ts: Parsed documents whose public lesson URLs omit the module, plus explicit per-language ordering and module labels.

schema.ts: Strict course, lesson, and directory metadata schemas.

source.ts: Explicit-language course/lesson queries by public URL, and compiled article lookup by file path.

types.ts: Serializable public content, manifest, and translation types.

validate.ts: Identity, unique lesson-slug, revision, and reference validation. Course introductions can publish before lessons; removed lesson URLs leave the catalog, search, and sitemap.

[PROTOCOL]: Update this header when making changes, then check README.md.
