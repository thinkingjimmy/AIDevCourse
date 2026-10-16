# src/components/course/

> L2 | Parent: [../README.md](../README.md)

chip-explode.tsx: Exploded AI chip for the course hero. Opens once and stays open; callouts fade in after it settles. Hover eases it shut. Pauses offscreen. Reduced motion shows the exploded still with callouts.

chip-explode-markup.ts: Inline SVG for that animation, generated from the anatomy iso-kit.

chip-explode.module.css: Light grayscale kit styles, scoped to the course figure, matching the homepage Mac.

course-layout.tsx: Full-bleed lesson wiki. A shadcn Sidebar holds the logo, course title, progress, and collapsible modules (number and title only). A completed lesson shows a green check from the existing progress record. Search and language sit in SidebarFooter. At ≤960px the same sidebar opens from a 课程目录 button as a sheet. Search is not a field in the tree.

empty-courses.tsx: Empty course library, an about link, and links to courses published in other languages.

lesson-navigation.tsx: Previous and next row under a top border; the first lesson's previous link returns to the course introduction.

translation-notice.tsx: Localized stale-translation notice with a valid original link.

[PROTOCOL]: Update this header when making changes, then check README.md.
