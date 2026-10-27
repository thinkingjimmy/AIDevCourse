# src/components/

> L2 | Parent: [../README.md](../README.md)

UI grouped by responsibility; shared domain logic belongs in `src/lib`. Import components directly from their files.

Application icons use Phosphor Icons with direct `@phosphor-icons/react/dist/ssr/<Name>` imports. These work in server and client components without an icon context or the full icon catalog. Brand shapes and the Mac/chip illustrations remain separate artwork.

- [course/](./course/README.md): Course cards, discovery, reading shell, sidebar, lesson navigation, and translation notices.
- [ui/](./ui/README.md): Shared shadcn actions, alerts, cards, tables, input, and overlay primitives.
- [illustrations/](./illustrations/README.md): Mac and chip artwork with one shared animation driver.
- [layout/](./layout/README.md): Reusable Tailwind page primitives, site frame, header, 404 layout, and native language switcher.
- [mdx/](./mdx/README.md): Shared Markdown registry, themed tables, JimmyNote author commentary, headings, and localized code blocks.
- [progress/](./progress/README.md): Learning-state provider and the lesson completion action.
- [search/](./search/README.md): Keyboard-only search controller and lazy search dialog.

[PROTOCOL]: Update this header when making changes, then check README.md.
