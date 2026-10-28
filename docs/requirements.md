# Current product requirements

> L2 | Parent: [README.md](./README.md)

AIDevCourse is a multilingual site for learning from local Markdown and MDX courses. Reading must work without an account or a model API key. LLM 101 has introductions in five languages, Chinese lessons about LLM generation, input quality, and tokens, and welcome placeholders in the other languages. Engineering fixtures remain separate from published courses.

## Routes and publication

| Route | Required behavior |
| --- | --- |
| `/` | Detect saved/browser language. Serve English at this URL, or redirect to another language with a private, non-cacheable 307 response. |
| `/` or `/{lang}` | Show the current language's courses. The start-learning action (马上学习 in Chinese) opens LLM 101's first published lesson. Keep a useful empty state when no courses exist. |
| `/courses/{course}` or `/{lang}/courses/{course}` | Render course metadata, available modules, and the syllabus. |
| `/courses/{course}/{lesson}` or `/{lang}/courses/{course}/{lesson}` | Render a published lesson, its local headings, recent-visit recording, inline achievements where authored, and adjacent lessons. |
| `/about` or `/{lang}/about` | Explain the site, language preference, and local learning storage. |
| `/api/search/{lang}` | Serve the same build's public, single-language content index. |

Supported languages are `en`, `zh`, `ja`, `fr`, and `es`. English public URLs have no locale prefix; the other four languages retain theirs. Only `/` uses a valid preference cookie, then `Accept-Language`, then `en`. An explicit `?lang=en` homepage choice supports native language links without JavaScript and saves the preference. Other canonical URLs always use their declared language. Former `/en` paths redirect permanently to the equivalent prefix-free URL. Unknown routes and missing translations return HTTP 404 with working recovery links. All 404 entries use the same two-column page with a direct localized Page not found title, regular-weight Geist Pixel title/numeral typography with CJK fallbacks, and square raised buttons matching the homepage Hero. `/courses` and `/{lang}/courses` are not pages; the language homepage lists courses.

Content in `content/` is public. Every course and module declares order through `meta.json`. Course introductions do not count as lessons. Course overviews use frontmatter and the generated syllabus; their MDX bodies are not rendered. Lesson URLs omit module directories.

## Language and identity

- Use the exact product name `AIDevCourse` in every language. The selected terminal-prompt logo appears in navigation and browser icons. Keep its source and web exports in `public/images/brand/`.
- Identify languages by their names in the switcher; flag decorations cannot replace them. Localize controls, errors, empty states, and accessible names.
- Keep `courseId`, `lessonId`, and `sourceLocale` stable across translations and URL changes.
- Link to the requested translation when available. Otherwise, explain the missing translation and link to its course overview or language homepage.
- Preserve a URL fragment only when the destination renders that anchor. Do not substitute another language's body or fabricate a translation.
- Infer course/lesson kind from the file path. Articles require only courseId, lessonId, title, and description. Do not maintain reading duration, lesson classification, verification metadata, revision numbers, or stale-translation notices.

## Learning and search

- Save earned achievements and recent position in browser storage. Stable course/achievement IDs share earned counts across translations. Reading, navigation, and skipping an exercise never unlock achievements.
- Show a 🥇 medal inside a circular achievement progress ring with a localized title and earned count at the bottom left of the sidebar footer. Put a More button at the far right; its dropdown contains About and a Change language submenu. Preserve translation fallback, locale cookies, valid translated anchors, keyboard/touch navigation, and focus restoration. Without JavaScript, expose native About/language links. Progress uses earned achievements divided by registered achievements available in the course; courses without achievements show an empty ring. Do not show a numerical total, percentage, or lesson completion checks. Lesson footers have no completion action.
- Synchronize records across tabs. Repeated unlocks count once. Restore before enabling interaction; saved unlocks render without replaying celebration.
- Leave legacy lesson completion records untouched and exclude them from achievements. Keep the existing recent-visit key.
- Storage failures keep reading and unlocks available in page memory. Protect corrupt records and explain possible loss after refresh in the earned card.
- Search only published content in the active language. Index visible course titles and descriptions, plus lesson bodies and rendered headings. Support keyboard navigation, input composition, loading, empty, and failure states.
- Never activate results from an older query. Clear the search state when the language changes.

## Reading and interaction

Use one shared light theme and language-aware system fonts. Keep decorative grids and illustration motion away from the article body. Preserve native navigation and readable content without JavaScript.

All controls need visible focus and localized names. Mobile menus close after navigation and restore focus when dismissed. Honor reduced motion and pause decorative animation offscreen. Long headings must wrap; tables and code scroll within their containers without widening the page.

Use the supported Markdown and MDX subset described in [authoring.md](./authoring.md). Images need meaningful localized alt text and known dimensions. The build must reject unsafe MDX, invalid metadata, duplicate identities or paths, broken local links, and missing rendered anchors.

Markdown page links show an optional preview after 350ms of hover or keyboard focus. The card shows the page title, description, hostname, and available cover, stays open while hovered, fits the viewport, and closes with Escape without moving focus. Fetch metadata only after opening and reuse requests. Local published articles use catalog metadata; external HTTPS previews are limited to published outbound links, public IP destinations, bounded responses, checked redirects, and a short deadline. Loading and unavailable states are localized in five languages. Missing metadata or images must preserve native navigation. Touch links open on the first tap. Hash, email, and download links and no-JavaScript reading retain their native behavior.

Proxy-generated DNS addresses may use a public HTTPS resolver fallback, with the same public-IP checks on the real answers. Pages that deny metadata reads or have no usable metadata produce a normal empty-204 preview response instead of a server error. Local development must apply CSS edits without missing stylesheet chunks, unhandled browser rejections, or a full document reload.

The Chinese What a language model does lesson requires two local demonstrations, with no model or network calls:

- Generation: a fixed fictional weather question and answer, initially empty, advanced one illustrative character at a time, with the current input, new character, and next input visible. Completion disables advancement; reset returns to the initial state. Rapid clicks must not skip characters. A static sequence keeps the explanation readable without JavaScript. The generation demo itself does not unlock achievements and has no automatic playback.
- Menus: a borderless layout without an outer shadow and two equal-width columns, each centering one control using shared Button styles, each showing only 请点击 with no arrows. There is no title, labels, separators, status rows, or explanatory footer. The native browser select and shadcn-style Radix dropdown share the same A/B/C choices and expose selection through accessible labels while keeping the visible labels unchanged. Keyboard selection, Escape dismissal, focus restoration, narrow-screen layout, and accessible names must work. The native select remains available without JavaScript; the surrounding article explains the comparison.

Acceptance includes desktop and mobile interactions, completion and reset, menu keyboard behavior, accessibility, no horizontal page overflow, no-JavaScript reading, and repeatable screenshot evidence. The declarative Achievement block replaces the static milestone at the same location. Its ‘🥇 成就挑战’ label introduces the weather question directly, without a separate prompt heading, with vertically stacked A/B native radio choices. Reuse the article quote-frame border and offset shadow; make each full option row clickable and show which answer was selected. A wrong answer shows an error icon, an explicit incorrect-answer label, and the explanation in a bordered error panel; allow retry. A correct answer immediately records ‘分清生成与查证’, updates the sidebar, and reveals the earned card containing only its earned title, takeaway, and retry action. Do not repeat the question, correct-answer label, or explanation in the earned card; announce success through its live status. No reveal action is required. Focus the earned title without scrolling and apply one brief opacity emphasis unless reduced motion is requested. The earned card offers Try again. Retrying clears the selected answer and feedback, restores focus to the first answer without scrolling, and enables a fresh attempt. Wrong answers during a retry remain visible and allow correction. Retrying never removes the saved achievement, changes its original unlock time, or increases the earned count. Refreshing an existing unlock shows the earned card directly without celebration. Without JavaScript, show the question, an expandable explanation, and the inability to unlock or save. The Chinese generation lesson contains this exercise. The Chinese token lesson adds the token-boundaries achievement after its token/word boundary explanation and before practical uses, with three choices testing that tokens are text fragments and tokenizer behavior can differ. Both exercises contribute to the same course inventory; all five sidebar dictionaries show shared counts. Authors can add distinct single-choice achievements to other articles using only MDX. Achievement requires stable id, title (the earned achievement name), question, answer, explanation, takeaway, and at least two plain-text AchievementOption children with distinct stable values. The correct answer must match an option. Build validation rejects malformed definitions, duplicate course achievement IDs, exercises in non-rendered course overviews, and translated ID/option/answer drift. Translations may omit an exercise; course totals always use the original-language inventory. Existing saved unlocks retain their keys. Interface labels are localized in five languages; authored content stays in the article.

Earned cards place an always-visible 20px ArrowCounterClockwise retry icon at the far right of the title's first line, using the shared ghost/icon-touch Button with a 44px hit area and localized aria-label/title. Titles wrap without pushing the icon outside the card. Every local correct answer, including a retry, emits a roughly three-second confetti celebration upward and inward from both viewport bottom corners. Use 240 pieces on desktop and 160 below 640px, with eight vivid colors, varied squares/circles/ribbons, and three overlapping launches. Particles spread across the screen and rise near its upper edge before falling and fading. The decorative layer cannot intercept input or change layout. Wrong answers, reloads, and tab synchronization never celebrate. Reduced motion suppresses both confetti and opacity emphasis. Completion, retry, replacement, unmount, and switching to reduced motion clean up all celebration resources. These presentation changes never alter earned records or counts.

Canonical URLs, hreflang entries, search indexes, and sitemap entries must describe the same published catalog. Preview deployments use `noindex`. Production requires an explicit valid HTTPS `SITE_URL` and rejects fixture content.

## Scope and acceptance

The current scope is course discovery, reading, translation navigation, local achievements, recent visits, and search. Accounts, payments, cloud sync, model execution, scored exams or a general quiz engine, embedded video, dark mode, and learning-record import/export have no active implementation requirement. Add an interactive teaching component only when a real article requires it; first define its input, states, failure behavior, and acceptance cases.

Use [architecture.md](./architecture.md) for code boundaries and [deployment.md](./deployment.md) for release gates. Changes require source checks, a production build where applicable, and E2E checks for affected behavior. A release also requires both complete browser matrices, reviewed published content and translations, real-device/input-method checks, and deployment verification. Local automated results do not establish that these release gates are complete.

[PROTOCOL]: Update this header when making changes, then check README.md.
