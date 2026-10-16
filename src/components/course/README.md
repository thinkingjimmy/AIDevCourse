# src/components/course/

> L2 | Parent: [../README.md](../README.md)

chip-explode.tsx: Tailwind stage and shared illustration paint for the exploded AI chip for the course hero. Opens once and stays open; callouts fade in after it settles. Hover eases it shut. Pauses offscreen. Reduced motion shows the exploded still with callouts.

chip-explode-markup.ts: Inline SVG for that animation, generated from the anatomy iso-kit.

course-card.tsx: Compact horizontal catalog card composed from shared Card parts. Localized hero text has 20px inner spacing on the left. The chip is centered on a full-height muted zinc panel that reaches the card's top, bottom, and right edges. The whole card is a native link.

course-layout.tsx: Full-bleed lesson wiki. The logo row ends with a shadcn SidebarTrigger. Desktop collapse keeps a 48px rail and its toggle; the course, progress, modules, and footer leave the tab order. Sidebar and module state survive lesson changes and reloads in this session, with an in-memory fallback. Phosphor checks mark completed lessons. SidebarFooter contains the globe menu and keyboard-only search with no visible search button. At ≤960px the sidebar opens from the course directory button as a sheet.

empty-courses.tsx: shadcn action and Tailwind empty course library, an about link, and links to courses published in other languages.

lesson-navigation.tsx: Tailwind previous and next row with Phosphor direction icons under a top border; the first previous link returns to the course introduction.

translation-notice.tsx: Shared Alert with localized stale-translation notice with a valid original link.

[PROTOCOL]: Update this header when making changes, then check README.md.
