# src/components/course/

> L2 | Parent: [../README.md](../README.md)

chip-explode.tsx: Tailwind stage and shared illustration paint for the exploded AI chip. Opens once and stays open; callouts fade in after it settles when they are enabled. Hover eases it shut. Pauses offscreen. Reduced motion shows the exploded still, with callouts only when enabled. The course hero keeps the leader lines and names. The catalog card turns callouts off.

chip-explode-markup.ts: Inline SVG for that animation, generated from the anatomy iso-kit. The card export drops the leader lines and names and crops the view box to the chip.

course-card.tsx: Compact horizontal catalog card composed from shared Card parts. Localized hero text has 20px inner spacing on the left. The chip is centered on a full-height muted zinc panel that reaches the card's top, bottom, and right edges. Its frame matches the cropped chip view box, so the drawing fills the panel without leader lines or names. The whole card is a native link.

course-layout.tsx: Full-bleed lesson wiki. The logo row ends with a shadcn SidebarTrigger. Desktop collapse keeps a 48px rail and its toggle; the course, progress, modules, and footer leave the tab order. Sidebar and module state survive lesson changes and reloads in this session, with an in-memory fallback. Phosphor checks mark completed lessons. SidebarFooter contains the globe menu and keyboard-only search with no visible search button. At ≤960px the sidebar opens as a sheet and returns focus to the course directory button when closed.

empty-courses.tsx: shadcn action and Tailwind empty course library, an about link, and links to courses published in other languages.

lesson-navigation.tsx: Tailwind previous and next row with Phosphor direction icons under a top border; the first previous link returns to the course introduction.

translation-notice.tsx: Shared Alert with localized stale-translation notice with a valid original link.

[PROTOCOL]: Update this header when making changes, then check README.md.
