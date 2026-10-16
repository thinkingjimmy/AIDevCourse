# src/styles/

> L2 | Parent: [../README.md](../README.md)

tokens.css: Shared Tailwind/shadcn colors, fonts, radius, author-note surface colors, and Fumadocs content tokens.

globals.css: Public CSS entry, native defaults, locale fonts, focus, selection, and reduced motion. Page and control styles use Tailwind utilities in TSX.

prose.css: Markdown typography, images, blockquotes, and task lists. Code backgrounds follow the Shiki palette to preserve syntax contrast. Shared Table parts own table styles through Tailwind.

illustrations.css: Shared SVG paint classes for the Mac and chip. React owns animation; Tailwind owns stage layout.

preview.css: Tailwind entry and native document defaults for the isolated /design previews. Preserves their existing browser typography without adding a second component stylesheet.

Use arbitrary font sizes where the previous design inherits line height. Changing `text-[14px]` to `text-sm` also changes line height and needs a visual comparison.

[PROTOCOL]: Update this header when making changes, then check README.md.
