# tests/e2e/mdx/

> L2 | Parent: [../README.md](../README.md)

- `highlights.spec.ts`: Real MDX compilation/rendering and authoring CLI checks for gray marker-stroke ==text== highlighting and SVG asset delivery, emphasis, links, heading anchors, escaped/code literals, incomplete delimiters, responsive wrapping, and no-JavaScript reading, with screenshots and JSON evidence.
- `link-preview.spec.ts`: Intent delay, hover persistence, metadata loading/cache/failure/image fallback, real local API metadata and destination policy, keyboard/Escape, narrow/enlarged reading, first-tap navigation, and no-JavaScript screenshots/JSON evidence. External metadata responses are controlled to keep acceptance independent of third-party uptime.
- `development.spec.ts`: Isolated Webpack development server, home-to-lesson navigation, real CSS hot replacement without a document reload, stylesheet delivery, browser errors, and screenshot/JSON/server-log evidence; runs once in Chromium without touching the user's server.

- `achievement.spec.ts`: Header retry icon layout, 44px hit area, wrapping and enlarged text, keyboard focus, dense bottom-corner confetti with eight colors, varied shapes and three overlapping launches, natural completion, retry/unmount cleanup, passive refresh/tab restoration, and reduced-motion suppression/cancellation, with screenshots and JSON evidence.

After `pnpm build`, run `pnpm test:e2e tests/e2e/mdx/highlights.spec.ts`. The report, screenshots, style data, and authoring CLI evidence are saved under `.artifacts/e2e/public/`. Achievement presentation checks use `pnpm test:e2e tests/e2e/mdx/achievement.spec.ts`.

[PROTOCOL]: Update this header when making changes, then check README.md.
