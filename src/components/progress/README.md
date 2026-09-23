# src/components/progress/

> L2 | Parent: [../README.md](../README.md)

Learning controls use the pure storage and selection logic in `src/lib/progress`.

- `lesson-completion.tsx`: Completion card with an explicit complete/undo action and an independent last-visit update.
- `progress-controls.tsx`: `ProgressSegments`, `ContinueLink`, and the `CourseProgress` panel with accessible reset confirmation.
- `progress-provider.tsx`: Hydration-safe progress context, explicit actions, tab sync, and `useLessonStates` (done / current / todo).

[PROTOCOL]: Update this header when making changes, then check README.md.
