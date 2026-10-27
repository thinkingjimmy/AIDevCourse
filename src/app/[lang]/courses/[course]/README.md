# src/app/[lang]/courses/[course]/

> L2 | Parent: [../README.md](../README.md)

[...lesson]/: Nested module; see [[...lesson]/README.md](./[...lesson]/README.md).

layout.tsx: Progress context for the overview and its lessons. The overview page owns the centered frame; lessons use the wiki shell.

page.tsx: Course overview with a hero aligned to the header and syllabus, a chip that loops assembly/explosion on hover, and two-column module cards. Its square white action uses the same action-raised Button variant as home, including the offset shadow. The hero shows the chip's leader lines and names after each opening settles and omits summary statistics. Empty courses show a localized updating state without a start-lesson action. Lesson links open in a new tab. No sidebar.

[PROTOCOL]: Update this header when making changes, then check README.md.
