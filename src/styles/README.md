# src/styles/

> L2 | Parent: [../README.md](../README.md)

tokens.css: Tailwind theme entry, importing typography and defining shared colors, Geist font families, SVG paint colors, radius, and Fumadocs tokens. Author notes use the shared background, border, and reading colors.

typography.css: Rem-based text sizes, unitless line heights, and tracking tokens shared by public pages and design previews.

globals.css: Public Tailwind/Fumadocs entry with explicit source scanning, Geist Latin stacks paired with Noto Sans SC for Chinese and Noto Sans JP for Japanese, and native defaults expressed with @apply, including focus, selection, no-JS controls, and reduced motion.

prose.css: The course-prose Tailwind utility for Markdown reading, headings, links, code, images, and task lists, scoped above Fumadocs defaults. The shared quote-frame utility gives Markdown quotes, JimmyNote, ChatMessage, and achievement challenges the same black border and offset shadow. Content selectors exclude not-prose components. Shiki retains syntax colors.

illustrations.css: Tailwind @apply rules for static SVG paint hooks and callout states. React supplies runtime animation values.

preview.css: Isolated Tailwind entry for /design, importing shared prose and quote-frame utilities and using the typography contract and @apply defaults without Preflight.

## Styling contract

Use Tailwind utilities in TSX. Use @apply only for document defaults and generated Markdown/SVG hooks that cannot carry component classes. CSS files may define theme/custom properties and media conditions. Do not add a separate component stylesheet or literal CSS typography declarations. Runtime progress, animation transforms, and Shiki syntax colors can use inline values.

All font sizes use rem. These values assume the browser's default 16px root; do not fix the root size, so reader preferences can scale the interface. Use the shared cn helper for class overrides; its tailwind-merge configuration in src/lib/utils.ts registers custom text, leading, and tracking names. Update that configuration when adding a named utility.

| Utility | Default size | Role |
| --- | --- | --- |
| text-xs | 12px | Short metadata, counters, and compact labels |
| text-caption | 13px | Secondary explanations and table-of-contents links |
| text-sm | 14px | Navigation, controls, tables, and code |
| text-ui | 15px | Site chrome, menus, and catalog labels |
| text-base | 16px | Body text and mobile inputs |
| text-lg | 18px | Lead copy and small section titles |
| text-xl | 20px | Markdown section headings |
| text-2xl | 24px | Cards and catalog sections |
| text-3xl | 30px | Preview metrics |
| text-title | 32px | Mobile page and hero titles |
| text-4xl | 36px | Lesson titles |
| text-display | 40px | Intermediate hero and preview titles |
| text-5xl | 48px | Desktop page titles |
| text-hero | 56px | Desktop homepage title |

PageTitle owns responsive hero, page, and lesson variants. Font weights use font-normal for text, font-medium for control emphasis, font-semibold for headings, and font-bold for active lesson navigation. The homepage and 404 titles use font-pixel font-normal; the decorative 404 numeral uses the same font. Shared Latin font variables come from src/lib/fonts.ts, and Chinese/Japanese glyphs use the existing locale-specific fallbacks.

Text utilities provide role defaults. Override line height only with shared roles: leading-heading for titles, leading-copy for compact UI copy, leading-body for descriptions, and leading-reading for authored content. Chinese and Japanese prose use leading-cjk. Use tracking-heading for display titles and tracking-label for short mono eyebrows. Avoid per-component numeric text, leading, or tracking values; structure:check rejects them.

Decorative exceptions are text-error for the fluid 404 numeral, text-8xl for its mobile size, and text-diagram-label/text-diagram-caption inside aria-hidden SVG artwork. They must not be used for readable interface text.

Verify typography changes against the production build with:

```bash
pnpm test:e2e tests/e2e/styles.spec.ts --project=chromium --grep 'Tailwind typography|Tailwind reading'
```

This covers five languages, desktop/mobile/320px viewports, course reading, previews, enlarged root text, search inputs, screenshots, and JSON metrics. Use scoped component and table E2E when changing generated-content selectors.

[PROTOCOL]: Update this header when making changes, then check README.md.
