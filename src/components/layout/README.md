# src/components/layout/

> L2 | Parent: [../README.md](../README.md)

english-tools.tsx: Keyboard-only search and the globe menu for the root 404, outside the locale request.

home-header.tsx: Single-row zinc bar with the shared AIDevCourse logo on the left and the About link immediately before the globe menu on the right, including mobile. Search remains keyboard-only.

language-switcher.tsx: Shared globe Button and content-sized native language menu, aligned to the trigger's right edge to stay inside the sidebar and viewport. Header and sidebar use the site rails' border token, offset shadow, muted text, flags, and selected check. Placement changes direction only. Native links explain missing translations and retain valid hashes, preference saving, and no-JS access. Escape, tabbing out, and outside pointer presses close the menu without cancelling link activation.

missing-page.tsx: Two-column unavailable page shared by locale and root 404 documents.

page-primitives.tsx: Shared Tailwind page containers, viewport-centered rails, SiteLogo, title variants, hero parts without extra copy inset, status layout, action group, and footer with the author link to jimmywong.dev. Hero text inherits its container's left edge on home and course overviews. The shell keeps a 56 px header and anchor offset at every viewport size. SiteLogo reads the configured name and optimized 24 px image for headers, the lesson sidebar, and design previews.

providers.tsx: Shared light-only UI providers.

site-frame.tsx: Zinc frame, sticky header, and shared footer for locale pages, including course overviews. Only published lesson routes render without this frame; missing lesson URLs retain recovery navigation.

[PROTOCOL]: Update this header when making changes, then check README.md.
