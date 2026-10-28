# src/components/layout/

> L2 | Parent: [../README.md](../README.md)

english-tools.tsx: Keyboard-only search and the globe menu for the root 404, outside the locale request.

home-header.tsx: Single-row zinc bar with the shared AIDevCourse logo on the left and the About link immediately before the globe menu on the right, including mobile. Search remains keyboard-only.

language-switcher.tsx: Shared native globe menu and LanguageSubmenu for the sidebar More dropdown, with one link implementation for both. The native menu is aligned to the trigger's right edge to stay inside the sidebar and viewport. Native menus use the site rails' border token, offset shadow, muted text, flags, and selected check. Placement changes direction only. Native links explain missing translations and retain valid hashes, preference saving, canonical English paths, and explicit no-JS English-home selection. Escape, tabbing out, and outside pointer presses close the menu without cancelling link activation.

missing-page.tsx: Single two-column 404 renderer. An explicit locale selects copy, available-course/home/language links, regular-weight Geist Pixel headings and numerals, and the same square raised action buttons as the homepage Hero.

page-primitives.tsx: Shared Tailwind page containers, viewport-centered rails, SiteLogo, title variants, hero parts without extra copy inset, status layout, action group, and footer with the author link to jimmywong.dev. Hero text inherits its container's left edge on home and course overviews. The shell keeps a 56 px header and anchor offset at every viewport size. Title, lead, metadata, and footer typography use the shared Tailwind scale; responsive title variants own their size and leading. SiteLogo reads the configured name and optimized 24 px image for headers, the lesson sidebar, and design previews.

providers.tsx: Shared light-only UI providers with the default English locale prefix hidden.

site-frame.tsx: Zinc frame, sticky header, and shared footer for locale pages, including course overviews. Internal rewritten English paths are normalized before shell selection. Only published lesson routes render without this frame; missing lesson URLs retain recovery navigation.

[PROTOCOL]: Update this header when making changes, then check README.md.
