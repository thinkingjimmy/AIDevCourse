# Website preview screenshots

`WebsitePreview` uses local screenshots and native destination links. The browser frame stays outside the screenshot so the same component can display other websites. Refresh an image when its source changes; no remote capture service runs during reading or builds.

| Website | Capture source | Destination | Asset | Capture settings |
| --- | --- | --- | --- | --- |
| Jimmy's personal website | `http://localhost:3000/en` | [jimmywong.dev/en](https://jimmywong.dev/en) | `public/images/websites/jimmy-home.webp` | November 10, 2026; Chromium; 960 × 840 CSS pixels; 2× scale; light theme; WebP quality 88 |
| DeepSeek homepage | `https://www.deepseek.com/en/` | [deepseek.com/en](https://www.deepseek.com/en/) | `public/images/websites/deepseek-home-en-hero.webp` | November 12, 2026. Chromium, 1440 × 620 CSS pixels, 2× scale, light theme, WebP quality 88. |

The screenshot of Jimmy's site preserves the rendered page content. Local development controls are hidden during capture. Fonts and network requests finish before capture. The destination was checked through its HTTPS redirect to `https://www.jimmywong.dev/en`.

Use a screenshot without browser chrome. Keep the local image and descriptive alt text in the MDX block; the normal image pipeline supplies intrinsic dimensions and responsive delivery. The screenshot area scrolls when the image exceeds the frame, and the address bar remains visible.

After a build, run `pnpm test:e2e tests/e2e/mdx/websites` for placement, independent scrolling, links, accessibility, mobile layouts, no-JavaScript reading, and authoring validation. Reports include screenshots and JSON evidence.
