# src/lib/

> L2 | Parent: [../README.md](../README.md)

Shared content, language, and browser-state logic. Rendering components live in `src/components`.

- [content/](./content/README.md): Course schemas, authoring validation, publication catalog, and compiled article queries.
- [i18n/](./i18n/README.md): Locale definitions, routing negotiation, messages, and framework translation adapters.
- [progress/](./progress/README.md): Guarded local storage and course-progress selectors.
- [search/](./search/README.md): Deterministic CJK and accent-aware tokenization shared by index and client.
- [seo/](./seo/README.md): Localized metadata, canonical/alternate URLs, and redirect validation.
- `site-config.ts`: Brand and metadata configuration with a safe local default.
- `utils.ts`: `cn` class merger for the shadcn UI primitives.

[PROTOCOL]: Update this header when making changes, then check README.md.
