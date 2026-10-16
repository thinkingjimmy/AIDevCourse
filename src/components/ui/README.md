# src/components/ui/

> L2 | Parent: [../README.md](../README.md)

Local shadcn/ui components use the shared Tailwind theme. Import components directly; product variants preserve the existing visual design.

alert.tsx: Alert, AlertTitle, and AlertDescription. Default callouts use a black border and 4px offset shadow; notice uses a quiet border; author uses a gray surface without a border or shadow for JimmyNote.

badge.tsx: Badge with outlined labels and secondary metadata pills, shared by the design previews.

button.tsx: Button and buttonVariants; native actions, link composition, completion, keyboard, preview, and 32px icon controls with 44px hit areas.

input.tsx: Input primitive shared by search and the optional sidebar field.

separator.tsx: Radix separator with horizontal and vertical Tailwind variants.

skeleton.tsx: Skeleton placeholder for optional sidebar loading states.

sidebar.tsx: Sidebar composition, a 320px desktop column, 48px collapsed rail, localized toggle labels, and mobile sheet at ≤960px. The toggle retains focus when it hides sidebar content. An open native menu handles Escape before the sheet closes; closing the sheet restores focus to its entry control.

[overlays/](./overlays/README.md): Shared dialog, mobile sheet, and tooltip primitives.

[data/](./data/README.md): Semantic table parts with zinc surfaces, row dividers, and native horizontal scrolling.

[surfaces/](./surfaces/README.md): Composable Card surfaces for the course catalog.

[PROTOCOL]: Update this header when making changes, then check README.md.
