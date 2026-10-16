# src/components/mdx/

> L2 | Parent: [../README.md](../README.md)

Shared rendering for course introductions and lessons. Register only supported components that have an actual authoring use case.

- `components.tsx`: Sole MDX registry, combining Fumadocs primitives, Phosphor callout icons, shared Alert and Table parts, JimmyNote, Heading, and localized code blocks. Markdown tables use zinc surfaces and keep each column at least 160px wide, with native horizontal scrolling on narrow screens.
- `code-block.tsx`: Shared shadcn Button with Phosphor copy/status icons around server-highlighted Fumadocs code; Tailwind owns the wrapper.
- `heading.tsx`: Six-level native heading links with Phosphor link/status icons, shared Button, focus/touch visibility, and localized clipboard feedback.
- `jimmy-note.tsx`: Server-rendered author note with a reference gray surface, dark Jimmy label, native aside props, and rich Markdown children. Composes shared Alert parts without a border or shadow.

[PROTOCOL]: Update this header when making changes, then check README.md.
