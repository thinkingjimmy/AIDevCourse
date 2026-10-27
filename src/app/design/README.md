# src/app/design/

> L2 | Parent: [../README.md](../README.md)

Homepage studies and writing-component previews for AIDevCourse. These routes do not replace `/[lang]`. All previews use the same Tailwind typography scale as public pages.

- `catalog.ts`: Reads the published `content/zh/ai-101` course for the previews only, without reading-time or article-type metadata.
- `layout.tsx`: Tailwind preview entry and Geist document shell with inherited root brand icons, separate from the live site header.
- `ui.tsx`: Shared SiteLogo and configured product name, variant switch, header, and footer.
- `page.tsx`: Index of the three studies.
- `a/page.tsx`: Catalog homepage.
- `b/page.tsx`: The course itself as the homepage.
- `c/page.tsx`: Studio homepage with the real first-task diff.
- [components/](./components/README.md): Live JimmyNote and table examples compiled from MDX, plus authoring syntax. These remain available when courses have no lessons.

[PROTOCOL]: Update this header when making changes, then check README.md.
