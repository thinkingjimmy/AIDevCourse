# AIDevCourse

[English](../README.md) · **简体中文**

AIDevCourse 是一门面向初学者的开源课程。你可以从观察语言模型如何选出下一个 Token 开始，再用一个网页理解前端、后端和数据库如何配合，逐步学习用 AI 做软件。没有编程经验也可以开始。

**[打开中文课程](https://ai-dev-course.vercel.app/zh)** · [先读《关于这门课》](https://ai-dev-course.vercel.app/zh/courses/getting-started/about-this-course)

## 从哪里开始

| 你想学什么 | 推荐起点 |
| --- | --- |
| 理解 Token、模型训练和工具调用 | [LLM 101](../content/zh/llm-101/) |
| 用 DeepSeek Chat 解决实际问题 | [DeepSeek 101](../content/zh/deepseek-101/) |
| 搞清楚一个网站怎样运行 | [Coding 101：前端、后端、数据库分别做什么](../content/zh/coding-101/web-foundations/frontend-backend-and-database.mdx) |
| 找到适合自己的学习顺序 | [从想法到作品：关于这门课](../content/zh/getting-started/before-you-start/about-this-course.mdx) |

Jimmy 在博客中记录自己对开发工具和企业应用 AI 的观察。[阅读博客](../content/zh/blog/)

站内提供交互演示、练习，以及设计、动效和编程术语词典。阅读进度保存在当前浏览器中。中文课程最全。LLM 101 提供中文、英文、日文、法文和西班牙文版本，其他课程的翻译进度各不相同。

## 本地运行

使用 Node.js **24.x** 和 pnpm **10.30.3**。本地阅读无需注册账号、配置数据库或申请 API 密钥。

```bash
git clone https://github.com/thinkingjimmy/AIDevCourse.git
cd AIDevCourse
pnpm install --frozen-lockfile
pnpm dev
```

打开[本地中文首页](http://localhost:3000/zh)。要预览修改，可以编辑 `content/` 中的一篇课程，在浏览器中打开对应页面。保存后，开发服务器会自动更新内容。

| 命令 | 用途 |
| --- | --- |
| `pnpm content:check` | 检查课程元数据、章节顺序和站内链接 |
| `pnpm check` | 检查仓库结构、代码、课程内容和翻译 |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 在本地运行已构建的生产版本 |

## 仓库导航

| 目录 | 内容 |
| --- | --- |
| [content/](../content/) | 按语言组织的 Markdown 和 MDX 课程 |
| [src/](../src/) | Next.js 路由、React 组件、界面翻译和样式 |
| [public/](../public/) | 网站直接使用的图片、字体和其他静态文件 |
| [config/](../config/) | Fumadocs 配置、课程目录生成和网址重定向 |
| [scripts/](../scripts/) 和 [tests/](../tests/) | 开发脚本、浏览器测试和测试用课程 |
| [docs/guides/](./guides/) 和 [docs/reference/](./reference/) | 写作与部署指南、架构说明和产品需求 |

## 参与贡献

遇到不懂的概念，或发现课程有误，请附上课程链接和相关段落。欢迎用中文或英文提交。[我要提问](https://github.com/thinkingjimmy/AIDevCourse/issues/new?template=01-question.yml) · [我要纠错](https://github.com/thinkingjimmy/AIDevCourse/issues/new?template=02-correction.yml)

编写或翻译课程，可以从作者指南和模板开始。修改网站代码，请先查阅贡献指南中的开发和验证步骤。[作者指南](./guides/authoring.md) · [课程与课时模板](./templates/) · [贡献指南](../.github/CONTRIBUTING.md) · [安全问题反馈](../.github/SECURITY.md)

## 作者与许可

课程由 Jimmy 维护。可以在 [X](https://x.com/thinkingjimmy)、[哔哩哔哩](https://space.bilibili.com/1409205119) 或[小红书](https://www.xiaohongshu.com/user/profile/6073d38d00000000010068a6)关注更新。[Jimmy 的网站](https://jimmywong.dev) · [MIT 许可证](../LICENSES/MIT.txt)

设计词典的术语和交互案例参考了 Index 的设计词典。动效词典的进入与退出动效术语参考了 Emil Kowalski 的作品。[Index’s Vocabulary](https://index.how/to/articulate) · [Animation Vocabulary](https://animations.dev/vocabulary#entrances-and-exits)
