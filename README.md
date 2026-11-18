# AIDevCourse

**English** · [简体中文](./docs/README.zh-CN.md)

AIDevCourse is an open-source course for people learning how language models work and how to build software with AI. Follow a model as it picks its next token, then explore how a browser, a server, and a database work together in a web app. You can start without programming experience.

**[Open the course](https://ai-dev-course.vercel.app/?lang=en)** · [Read the first LLM lesson](https://ai-dev-course.vercel.app/courses/llm-101/what-a-language-model-does)

## What to read

| If you want to… | Start here |
| --- | --- |
| Understand tokens, model training, and tool calls | [LLM 101](./content/en/llm-101/) |
| Try DeepSeek Chat on a practical task | [DeepSeek 101](./content/en/deepseek-101/) |
| Learn how a web app fits together | [Coding 101 · Chinese](./content/zh/coding-101/web-foundations/frontend-backend-and-database.mdx) |
| Choose a learning path | [About this course · Chinese](./content/zh/getting-started/before-you-start/about-this-course.mdx) |

Jimmy also writes about developer tools and how companies use AI. [Read the blog (Chinese)](./content/zh/blog/)

The site includes interactive examples, exercises, and dictionaries for design, animation, and programming. It saves reading progress in your browser. Chinese has the widest coverage. LLM 101 is available in Chinese, English, Japanese, French, and Spanish. Translation coverage varies by course.

## Run locally

Use Node.js **24.x** and pnpm **10.30.3**. Local reading works without an account, a database, or an API key.

```bash
git clone https://github.com/thinkingjimmy/AIDevCourse.git
cd AIDevCourse
pnpm install --frozen-lockfile
pnpm dev
```

Open the [local site](http://localhost:3000/). To try an edit, save a lesson in `content/` and open its page. The development server updates the lesson as you work.

| Command | Purpose |
| --- | --- |
| `pnpm content:check` | Validate lesson metadata, ordering, and internal links |
| `pnpm check` | Run repository, code, content, and translation checks |
| `pnpm build` | Build the production site |
| `pnpm start` | Serve the production build locally |

## Find your way around

| Path | What lives here |
| --- | --- |
| [content/](./content/) | Markdown and MDX courses, organized by language |
| [src/](./src/) | Next.js routes, React components, interface translations, and styles |
| [public/](./public/) | Images, fonts, and other files served by the site |
| [config/](./config/) | Fumadocs configuration, catalog generation, and redirects |
| [scripts/](./scripts/) and [tests/](./tests/) | Development commands, browser tests, and test fixtures |
| [docs/guides/](./docs/guides/) and [docs/reference/](./docs/reference/) | Authoring and deployment guides, architecture, and product requirements |

## Contribute

If a lesson is unclear, include its link and the passage in your issue. Questions and corrections are welcome in English or Chinese. [Ask a question](https://github.com/thinkingjimmy/AIDevCourse/issues/new?template=01-question.yml) · [Suggest a correction](https://github.com/thinkingjimmy/AIDevCourse/issues/new?template=02-correction.yml)

For a content change, start with the authoring guide and its course and lesson templates. For a code change, the contribution guide covers setup and verification. [Authoring guide (Chinese)](./docs/guides/authoring.md) · [Templates](./docs/templates/) · [Contributing](./.github/CONTRIBUTING.md) · [Security policy](./.github/SECURITY.md)

## Author and license

Jimmy maintains AIDevCourse. Follow his updates on [X](https://x.com/thinkingjimmy), [Bilibili](https://space.bilibili.com/1409205119), or [Xiaohongshu](https://www.xiaohongshu.com/user/profile/6073d38d00000000010068a6). [Jimmy’s website](https://jimmywong.dev) · [MIT license](./LICENSES/MIT.txt)

The design dictionary draws on Index’s terminology and examples. The animation dictionary draws on Emil Kowalski’s vocabulary for entrances and exits. [Index’s Vocabulary](https://index.how/to/articulate) · [Animation Vocabulary](https://animations.dev/vocabulary#entrances-and-exits)
