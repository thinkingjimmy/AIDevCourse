# src/components/ui/

> L2 | Parent: [../README.md](../README.md)

shadcn/ui primitives for the lesson sidebar (new-york, Tailwind 4). `sidebar.tsx` is the upstream sidebar with a 320px column and a mobile sheet at ≤960px. The sheet body carries `mobile-course-bar` so the course-directory tests can find the tree.

button.tsx, input.tsx, separator.tsx, sheet.tsx, skeleton.tsx, tooltip.tsx: Registry dependencies of that sidebar. The sheet and tooltip do not use tw-animate-css; they open and close without those keyframes.

[PROTOCOL]: Update this header when making changes, then check README.md.
