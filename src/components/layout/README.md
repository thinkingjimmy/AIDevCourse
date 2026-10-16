# src/components/layout/

> L2 | Parent: [../README.md](../README.md)

english-tools.tsx: Keyboard-only search and the globe menu for the root 404, outside the locale request.

home-header.tsx: Zinc bar with the aidevcourse mark, About link, globe menu, and keyboard-only search. No visible search entry.

language-switcher.tsx: Shared globe Button and content-sized native language menu. Header and sidebar use the site rails' border token, offset shadow, muted text, flags, and selected check. Placement changes direction only. Native links explain missing translations and retain valid hashes, preference saving, and no-JS access. Escape, tabbing out, and outside pointer presses close the menu without cancelling link activation.

missing-page.tsx: Two-column unavailable page shared by locale and root 404 documents.

page-primitives.tsx: Shared Tailwind page containers, viewport-centered rails, logo, title variants, hero parts, status layout, action group, and footer with the author link to jimmywong.dev.

providers.tsx: Shared light-only UI providers.

site-frame.tsx: Zinc frame, sticky header, and shared footer for locale pages, including course overviews. Lesson routes render without this frame.

[PROTOCOL]: Update this header when making changes, then check README.md.
