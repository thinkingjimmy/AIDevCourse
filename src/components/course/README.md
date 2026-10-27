# src/components/course/

> L2 | Parent: [../README.md](../README.md)

- `course-card.tsx`: Linked course card with localized metadata, a data-illustration-hover boundary for whole-card assembly/explosion loops without callouts, and the language menu's offset shadow on hover and keyboard focus.
- `course-footer.tsx`: Medal progress ring using the MDX-derived course inventory, localized earned count, and a More dropdown with About and a language submenu; native links remain available without JavaScript, with downward language-menu placement in the mobile fallback.
- `course-layout.tsx`: Lesson shell, module navigation, localized achievement counts, and session-persisted desktop state. Current lessons and home/About links use canonical public paths. CourseFooter supplies the medal progress ring and More menu on desktop and mobile. The existing sidebar stays at the left edge; a named Tailwind reading container fills the remaining width with 32px desktop and 20px mobile gutters.
- `empty-courses.tsx`: Localized empty catalog and links to available languages.
- `lesson-navigation.tsx`: Previous and next lesson links; the first previous link returns to the course.
- `sidebar.tsx`: Course-specific desktop rail and mobile sheet; canonical public navigation closes the sheet.

[PROTOCOL]: Update this header when making changes, then check README.md.
