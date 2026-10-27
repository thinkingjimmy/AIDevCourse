# src/lib/content/

> L2 | Parent: [../README.md](../README.md)

- `manifest.ts`: Builds the publication catalog and translation map from validated documents; canonical course achievement inventories come from source-language articles.
- `mdx.ts`: Validates supported MDX syntax, headings, references, and static component attributes, including parameterless Chat, ChatMessage sender/state values with thinking restricted to assistants, the two What a language model does demos, and declarative Achievement/AchievementOption exercises with static required fields (question directly, title for the earned achievement), stable IDs, distinct choices, and a valid answer.
- `model.ts`: Serializable content and achievement types, stable identities, rendered anchors, and module grouping.
- `scan.ts`: Reads ordered language folders using the compiler's YAML parser, portable paths, canonical prefix-free English URLs, file-position kind inference, collision checks, and achievement extraction.
- `schema.ts`: Strict course/lesson author metadata and directory schemas; add the internal kind after path-selected validation.
- `source.ts`: Server-only course, lesson, and compiled article queries through mode-specific generated aliases, with the default English locale prefix hidden.
- `validate.ts`: Validates ownership, course-scoped achievement uniqueness and translated answer alignment, ordering, and links to rendered canonical destinations, including prefix-free English paths.

[PROTOCOL]: Update this header when making changes, then check README.md.
