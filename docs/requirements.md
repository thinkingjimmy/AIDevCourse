# Current product requirements

> L2 | Parent: [README.md](./README.md)

AIDevCourse is a multilingual site for learning from local Markdown and MDX courses. Reading must work without an account or a model API key. The published catalog contains the AI 101 introduction and a Hello World first-lesson placeholder in five languages. Engineering fixtures remain separate from published courses.

## Routes and publication

| Route | Required behavior |
| --- | --- |
| `/` | Negotiate a supported language and redirect with a private, non-cacheable 307 response. |
| `/{lang}` | Show the current language's courses. The start-learning action (马上学习 in Chinese) opens AI 101's first published lesson. Keep a useful empty state when no courses exist. |
| `/{lang}/courses/{course}` | Render course metadata, available modules, and the syllabus. |
| `/{lang}/courses/{course}/{lesson}` | Render a published lesson, its local headings, completion control, and adjacent lessons. |
| `/{lang}/about` | Explain the site, language preference, and local learning storage. |
| `/api/search/{lang}` | Serve the same build's public, single-language content index. |

Supported languages are `en`, `zh`, `ja`, `fr`, and `es`. Explicit language URLs take priority over preferences. Unprefixed entry routes use a valid preference cookie, then `Accept-Language`, then `zh`. Unknown routes and missing translations return HTTP 404 with working recovery links. `/{lang}/courses` is not a page; the language homepage lists courses.

Content in `content/` is public. Every course and module declares order through `meta.json`. Course introductions do not count as lessons. Course overviews use frontmatter and the generated syllabus; their MDX bodies are not rendered. Lesson URLs omit module directories.

## Language and identity

- Use the exact product name `AIDevCourse` in every language. The selected terminal-prompt logo appears in navigation and browser icons. Keep its source and web exports in `public/images/brand/`.
- Identify languages by their names in the switcher; flag decorations cannot replace them. Localize controls, errors, empty states, and accessible names.
- Keep `courseId`, `lessonId`, and `sourceLocale` stable across translations and URL changes.
- Link to the requested translation when available. Otherwise, explain the missing translation and link to its course overview or language homepage.
- Preserve a URL fragment only when the destination renders that anchor. Do not substitute another language's body or fabricate a translation.
- Use `contentRevision` for originals and `translatedFromRevision` for translations. Show a notice when a translation is behind its original.

## Learning and search

- Keep completion and recent position in browser storage. Translations share completion by stable identity; each language counts only its available lessons.
- Marking a lesson complete stays on that lesson. Following a next-lesson link does not mark it complete.
- Confirm course resets. Reset only that course's completion and recent position, including its translations; keep language preference and other courses.
- Synchronize storage events across tabs. Storage failures must keep reading available and allow in-memory progress.
- Search only published content in the active language. Index visible course titles and descriptions, plus lesson bodies and rendered headings. Support keyboard navigation, input composition, loading, empty, and failure states.
- Never activate results from an older query. Clear the search state when the language changes.

## Reading and interaction

Use one shared light theme and language-aware system fonts. Keep decorative grids and illustration motion away from the article body. Preserve native navigation and readable content without JavaScript.

All controls need visible focus and localized names. Mobile menus close after navigation and restore focus when dismissed. Honor reduced motion and pause decorative animation offscreen. Long headings must wrap; tables and code scroll within their containers without widening the page.

Use the supported Markdown and MDX subset described in [authoring.md](./authoring.md). Tool lessons need actual verification dates and environments. Images need meaningful localized alt text and known dimensions. The build must reject unsafe MDX, invalid metadata, duplicate identities or paths, broken local links, and missing rendered anchors.

Canonical URLs, hreflang entries, search indexes, and sitemap entries must describe the same published catalog. Preview deployments use `noindex`. Production requires an explicit valid HTTPS `SITE_URL` and rejects fixture content.

## Scope and acceptance

The current scope is course discovery, reading, translation navigation, local progress, and search. Accounts, payments, cloud sync, model execution, quizzes, embedded video, dark mode, and progress import/export have no active implementation requirement. Add an interactive teaching component only when a real article requires it; first define its input, states, failure behavior, and acceptance cases.

Use [architecture.md](./architecture.md) for code boundaries and [deployment.md](./deployment.md) for release gates. Changes require source checks, a production build where applicable, and E2E checks for affected behavior. A release also requires both complete browser matrices, reviewed published content and translations, real-device/input-method checks, and deployment verification. Local automated results do not establish that these release gates are complete.

[PROTOCOL]: Update this header when making changes, then check README.md.
