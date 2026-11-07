[简体中文](./docs/README.zh.md) · **English**

# AIDevCourse

A beginner course about large language models and coding with AI. Learn the basic concepts, then use AI to build simple websites and applications. No programming experience is required.

The course is open source and still in progress. Chinese has the most complete lessons. English, Japanese, French, and Spanish course introductions are available, but lesson translations are limited.

## Start learning

Start with [关于这门课 — About this course](./content/zh/getting-started/before-you-start/about-this-course.mdx) to understand the learning path.

| Course | What it covers | Status |
| --- | --- | --- |
| 从想法到作品 | Where to start and how to learn | Available; more lessons to come |
| LLM 101 | Language models, training, chat, tools, and agents | Chinese lessons available |
| Coding 101 | Build a website with AI, from the frontend to deployment | In progress; most lessons are placeholders |
| 设计 101 | Design basics | Lessons in preparation |
| Agent 101 | Build on the introductory agent concepts | Lessons in preparation |

The site includes interactive examples, design and animation dictionaries, and achievement exercises. It saves your learning progress in your browser. You can read without an account or a model API key.

## About the author

Created by [Jimmy](https://jimmywong.dev). Follow these channels for course updates and more about AI:

[X](https://x.com/thinkingjimmy) · [Bilibili](https://space.bilibili.com/1409205119) · [小红书](https://www.xiaohongshu.com/user/profile/6073d38d00000000010068a6)

## Questions and corrections

You can help improve the course without writing code. Use Chinese or English, and check existing Issues before opening a new one.

- **Questions:** [Ask a question](https://github.com/thinkingjimmy/aidevcourse/issues/new?template=01-question.yml) about a lesson or the project. Share what you want to understand. [Browse questions](https://github.com/thinkingjimmy/aidevcourse/issues?q=is%3Aissue%20label%3Aquestion).
- **Corrections:** [Suggest a correction](https://github.com/thinkingjimmy/aidevcourse/issues/new?template=02-correction.yml) for a typo or inaccurate explanation. Include the page and the relevant passage. [Browse corrections](https://github.com/thinkingjimmy/aidevcourse/issues?q=is%3Aissue%20label%3Acorrection).

For other suggestions or site problems, [open an Issue](https://github.com/thinkingjimmy/aidevcourse/issues/new/choose). To contribute content or code, read the [contribution guide](./.github/CONTRIBUTING.md).

## Run locally

Use Node **24.x** and pnpm **10.30.3** from a local copy of this repository:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000/zh](http://localhost:3000/zh). No database or third-party credentials are required.

Setup, commands, and verification steps are in the [contribution guide](./.github/CONTRIBUTING.md). See the [authoring guide](./docs/authoring.md) for lessons and translations, the [architecture guide](./docs/architecture.md) for implementation, and the [deployment guide](./docs/deployment.md) for publishing. The authoring and deployment guides are in Chinese.

Licensed under [MIT](./LICENSES/MIT.txt).

## Acknowledgments

Thanks to [Index’s Vocabulary](https://index.how/to/articulate) for the design-term references and inspiration for the interactive typography and color examples.

Thanks to [Emil Kowalski’s Animation Vocabulary](https://animations.dev/vocabulary#entrances-and-exits) for the entrance and exit terminology. The interactive examples are implemented locally.
