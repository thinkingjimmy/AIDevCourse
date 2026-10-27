# public/images/brand/

> L2 | Parent: [../README.md](../README.md)

The selected terminal-prompt mark is the official AIDevCourse logo. The shared `SiteLogo` component uses the web export in the public header, lesson sidebar, and design previews.

- `logo-source.png`: Unchanged 1254 × 1254 transparent original selected by the user.
- `logo.png`: 128 × 128 transparent web export. The mark uses 90% of the square so it remains legible at its 24 px display size.
- `apple-touch-icon.png`: 180 × 180 export with a white background for home-screen bookmarks.
- `README.md`: Asset map and export contract.

The exports use the source rectangle at x=186, y=174, width=904, height=904. Resample this square without changing the artwork. The browser favicon at [../../favicon.svg](../../favicon.svg) embeds a 64 px PNG from the same rectangle and inverts it for dark browser tabs. Its PNG payload is self-contained; no external image request is required.

Brand copy and the logo path are configured in `src/lib/site-config.ts`. Root metadata applies the favicon and touch icon to locale pages, design previews, and unavailable pages.

[PROTOCOL]: Update this header when making changes, then check README.md.
