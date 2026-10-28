# src/components/mdx/achievement/

> L2 | Parent: [../README.md](../README.md)

- `achievement.tsx`: Generic single-choice challenge with native radio rows, automatic option letters, explicit incorrect feedback, and immediate earned cards. The header pairs a wrapping earned title with an always-visible, localized Phosphor retry icon and a 44px hit area. Local correct answers trigger two-corner confetti and earned-title focus; retries restore first-option focus, cancel celebrations, and preserve saved records. Uses LearningProvider for course-scoped persistence and keeps a no-JavaScript explanation.
- `components.tsx`: Server MDX adapter binds Achievement/AchievementOption declarations to the article definitions collected by the content validator. Options render once through the client challenge.
- `confetti.ts`: Native Web Animations celebration from both viewport bottom corners; 240 desktop or 160 narrow-screen pieces in three overlapping launches, eight vivid colors, varied squares/circles/ribbons, wider and higher flight, and a roughly three-second finish. Uses transform/opacity-only animation, a non-interactive decorative layer, reduced-motion suppression, and idempotent cleanup.

[PROTOCOL]: Update this header when making changes, then check README.md.
