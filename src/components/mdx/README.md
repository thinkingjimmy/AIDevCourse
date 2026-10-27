# src/components/mdx/

> L2 | Parent: [../README.md](../README.md)

Shared rendering for course introductions and lessons. Text uses the shared Tailwind typography scale; not-prose components keep their own typography and layout. Register only supported components that have an actual authoring use case.

- `components.tsx`: Sole MDX registry, combining Fumadocs primitives, Phosphor callout icons, shared Alert and Table parts, JimmyNote, Chat, configurable ChatMessage, Heading, localized code blocks, What a language model does demos, and article-configured achievements. Markdown tables use zinc surfaces and keep each column at least 160px wide, with native horizontal scrolling on narrow screens.
- [chat/](./chat/README.md): Bordered article conversations with user/LLM avatars, message bubbles, and a plain Thinking state.
- `code-block.tsx`: Shared shadcn Button with Phosphor copy/status icons around server-highlighted Fumadocs code; Tailwind owns the wrapper.
- `heading.tsx`: Six-level native heading links with Phosphor link/status icons, shared Button, focus/touch visibility, and localized clipboard feedback.
- `jimmy-note.tsx`: Server-rendered author note with a gray background matching callout shadows, dark Jimmy label, native aside props, and rich Markdown children. Composes shared Alert parts without a border or shadow.
- `llm-generation-demo.tsx`: Automatic Chinese generation illustration with two full rows and fading history, equally padded content-sized panels, right-aligned candidates, character drops and line feeds, baseline-aligned word-aware input, a clean final answer, and embedded pause/resume/replay using shared Button and quote-frame styles. Preserves static no-JS reading.
- [llm-generation/](./llm-generation/README.md): Fictional example/timeline and animation lifecycle, with offscreen suspension, cached geometry, reduced-motion completion, and cleanup.
- [achievement/](./achievement/README.md): Generic Achievement/AchievementOption MDX binding and single-choice challenge with a shared quote frame, native radios, localized feedback, course-scoped persistence, and no-JavaScript explanation.
- `menu-comparison-demo.tsx`: Borderless comparison with two equal-width columns and centered outline Button styles, fixed 请点击 labels without arrows, native browser choices, Radix menu behavior, and accessible selection feedback.

[PROTOCOL]: Update this header when making changes, then check README.md.
