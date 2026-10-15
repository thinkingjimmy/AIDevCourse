# src/components/course/

> L2 | Parent: [../README.md](../README.md)

course-card.tsx: Course card with facts, a progress-aware continue action, and the compact lesson path.

chip-explode.tsx: Exploded AI chip for the course hero. Opens once and stays open; callouts fade in after it settles. Hover eases it shut. Pauses offscreen. Reduced motion shows the exploded still with callouts.

chip-explode-markup.ts: Inline SVG for that animation, generated from the anatomy iso-kit.

chip-explode.module.css: Light grayscale kit styles, scoped to the course figure, matching the homepage Mac.

course-layout.tsx: Lesson-only course index (current module expanded, text toward the frame) and the compact contents strip.

empty-courses.tsx: Empty course library, an about link, and valid alternate-language entries.

lesson-navigation.tsx: Previous and next cards; the first lesson's previous card returns to the course introduction.

syllabus.tsx: LessonStateIcon and the compact/full Syllabus list with restored lesson states.

translation-notice.tsx: Localized stale-translation notice with a valid original link.

[PROTOCOL]: Update this header when making changes, then check README.md.
