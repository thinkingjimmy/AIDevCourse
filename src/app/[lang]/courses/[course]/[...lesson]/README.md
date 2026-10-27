# src/app/[lang]/courses/[course]/[...lesson]/

> L2 | Parent: [../README.md](../README.md)

layout.tsx: Full-bleed wiki shell for the lesson. No site header.

page.tsx: Article starting with the title, followed by intro, body, prev/next row, recent-visit recording, and the on-this-page list. Completion buttons, verification metadata, and translation-revision notices are removed. The header omits module, lesson-number, and duration statistics. Validated article achievements bind to the generic MDX registry. The article body combines Fumadocs prose with the shared course-prose Tailwind typography. The article stays within 42.5rem (680px at the default root size). It and the 11.5rem TOC are centered together in a group up to 56rem wide, separated by 2rem. The TOC appears when the named reading container has at least 56rem of usable width, so sidebar collapse reflows and recenters the group. Lessons without headings retain one centered article column.

[PROTOCOL]: Update this header when making changes, then check README.md.
