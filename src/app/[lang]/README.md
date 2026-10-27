# src/app/[lang]/

> L2 | Parent: [../README.md](../README.md)

[...missing]/: Nested module; see [[...missing]/README.md](./[...missing]/README.md).

about/: Nested module; see [about/README.md](./about/README.md).

courses/: Nested module; see [courses/README.md](./courses/README.md).

error.tsx: Zinc error state with retry and a link home, without touching local learning records.

layout.tsx: Static locale-specific HTML, inherited root brand metadata, self-hosted Latin fonts, a frame keyed to published lesson URLs, and narrowly scoped client providers.

not-found.tsx: Localized unavailable page inside the zinc frame, linking to an available course or home.

page.tsx: Homepage with the zinc hero, exploded Mac, and a two-column CourseCard catalog that becomes one column on mobile. The catalog has a localized Fundamentals heading and no subtitle. The hero starts with the title; its title, intro, and action share the header and catalog's left edge without an extra inset. Cards place text on the left and a cropped chip without leader lines or names on the right. The white, square start-learning action shares the language menu's border, muted text, and offset shadow. It opens AI 101's first published lesson in the current language; an unavailable lesson falls back to the catalog.

unavailable/: Nested module; see [unavailable/README.md](./unavailable/README.md).

[PROTOCOL]: Update this header when making changes, then check README.md.
