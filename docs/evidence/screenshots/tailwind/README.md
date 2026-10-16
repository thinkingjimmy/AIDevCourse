# docs/evidence/screenshots/tailwind/

> L2 | Parent: [../README.md](../README.md)

chromium/: Local pre-migration PNG references, grouped by locale or surface and then desktop/mobile. These 69 files stay on this computer and are ignored by Git. The optional comparison allows at most 0.1% differing pixels.

Capture: `VISUAL_TEST=1 pnpm test:e2e tests/e2e/styles.spec.ts --project=chromium --grep appearance --update-snapshots` before changing appearance. Review the result before replacing an existing local reference.

Verify local appearance: `VISUAL_TEST=1 pnpm test:e2e tests/e2e/styles.spec.ts --project=chromium` after a production build. This opt-in needs local references; missing files fail unless snapshot updates are explicitly requested.

Default and CI runs execute interaction checks without screenshot comparisons. CI excludes appearance tests even when VISUAL_TEST=1 is set, so a clean checkout does not need these PNGs.

Report: `playwright-report/index.html` contains the current run and current screenshots. `test-results/` retains comparison images, failure traces, clipboard/storage feedback, and the tested chip animation pose.

Validated on 2026-10-16 with Chromium, Node 24.21.0, and pnpm 10.30.3. Lint and the production build passed. All 26 selected E2E checks passed, including 69 screenshot comparisons across five languages and desktop/mobile layouts. The project declares Node 22; this local run used the installed Node 24. Firefox and WebKit were not run.

Local-only policy verified on 2026-10-16: all four public-course interaction checks passed with the entire reference folder absent and both CI=1 and VISUAL_TEST=1 set. After restoring the folder, the opt-in Chinese desktop comparison passed for five surfaces. SHA-256 checks confirmed that all 69 PNGs were unchanged. Fixture CI selection contains site.spec.ts and learning.spec.ts, without the public-course styling suite. Local verification logs are under `.cache/local-screenshots/`.

Repeat the complete styling acceptance run locally:

```bash
pnpm build
VISUAL_TEST=1 pnpm test:e2e tests/e2e/styles.spec.ts tests/e2e/site.spec.ts --project=chromium --grep 'appearance:|shared controls|reading stays|storage and clipboard|hero illustrations|home, about, and accessible navigation|reading and native language|keeps a light'
```

[PROTOCOL]: Update this header when making changes, then check README.md.
