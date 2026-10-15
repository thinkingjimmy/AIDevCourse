# Learning AI Coding — 本地写作的 AI 编程学习网站

[English](./README.md) · **简体中文**

Next.js 16.3.6 + React 19.3.0 + Fumadocs MDX 15.4.3 / Core & UI 16.15.13 + next-intl 4.14.6 + Tailwind CSS 4.3.3

五语学习网站，支持本地 Markdown / MDX 课程、按语言搜索和浏览器本地学习进度。界面采用暖纸白、贯通的网格纵线、Newsreader 与 IBM Plex Mono（经 `next/font` 自托管）和简洁复古细节，无需账号、数据库、模型 API Key 或在线翻译服务。

**当前状态：**站点工程已实现。公开课程是 AI 入门（`ai-101`）：六个模块、31 篇课时。简体中文是原文。英文里写完的课有全文，其余是摘要。日文、法文和西班牙文公开标题和摘要。旧的 `/ai-coding` 地址会跳到 `/ai-101`。真机检查和部署仍待完成，任务统一维护在 [PRD 与 todo](./docs/PRD.md#13-markdown-开发任务)。

## 快速启动

使用 Node **22.17.0**、pnpm **10.30.3**。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

打开 [localhost:3000/zh](http://localhost:3000/zh)。修改 frontmatter、文件结构或 `meta.json` 排序后重启服务；正文编辑支持热更新。

首页设计稿不替换 `/zh`：[/design/a](http://localhost:3000/design/a)（目录）、[/design/b](http://localhost:3000/design/b)（课页）、[/design/c](http://localhost:3000/design/c)（工作台）。三份稿都读取 `content/zh/ai-101` 里已经公开的课。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动本地站点并展示公开课程 |
| `pnpm check` | 执行 lint、类型、内容、字典和单元检查 |
| `pnpm build` | 校验内容与字典，再构建生产版本 |
| `pnpm start` | 启动生产构建 |
| `pnpm test:e2e` | 在 Chromium、Firefox、WebKit 中验证生产构建 |

首次安装测试浏览器，然后验证正式内容和隔离样例两种模式：

```bash
pnpm exec playwright install chromium firefox webkit
pnpm check
pnpm build
pnpm test:e2e
CONTENT_TEST=1 pnpm build
CONTENT_TEST=1 pnpm test:e2e
```

E2E 默认使用 **3310** 端口，冲突时设置 `E2E_PORT`。工程样例位于 `tests/fixtures/<lang>/`，独立构建到 `.next-test`，禁止部署到 Vercel。测量性能时，在另一个终端运行 `CONTENT_TEST=1 pnpm start --port 3200`，再执行 `node scripts/measure-performance.mjs`。

## 项目地图

<directory>

| 目录 | 职责 |
| --- | --- |
| [`src/`](./src/README.md) | 应用代码：`app`、`components`、`lib`、`messages`、`styles` |
| [`content/`](./content/README.md) | 真实课程，直接按语言组织：`en`、`zh`、`ja`、`fr`、`es` |
| [`config/`](./config/README.md) | MDX 编译、ESLint、环境示例和 URL 重定向 |
| [`tests/`](./tests/README.md) | `unit`、`e2e` 及各自配置；隔离的 `fixtures` |
| [`scripts/`](./scripts/README.md) | 内容、字典检查和性能测量 |
| [`public/`](./public/README.md) | 公开站点图标与课程图片 |
| [`docs/`](./docs/README.md) | PRD、作者及部署指南、模板和验收证据 |
| [`.github/`](./.github/README.md) | GitHub Actions 质量检查工作流 |

</directory>

<config>

- `package.json` — 精确依赖、运行环境约束、命令和 PostCSS 配置。
- `pnpm-lock.yaml` — 可复现的依赖锁。
- `next.config.mjs` — 框架接入、公开范围保护和安全响应头。
- `tsconfig.json` — 编辑器可直接识别的 TypeScript 配置及源码别名。
- `.gitignore` — 排除依赖、本地环境文件、生成内容及构建与测试产物。
- `README.md` / `README.zh.md` — 英文和中文项目入口，更新时保持同步。
- `LICENSE` — 项目许可证。

</config>

路由位于 `src/app`；UI 按职责组织在 `src/components/{course,layout,mdx,progress,search}`；共享业务逻辑位于 `src/lib`。MDX 统一注册入口为 `src/components/mdx/components.tsx`。各目录 README 维护成员地图，源文件头说明输入、输出和职责。生成的 `.source` 与 `.next*` 不入 Git。

## 语言与学习记录

界面支持英文（`/en`）、简体中文（`/zh`）、日语（`/ja`）、法语（`/fr`）和西班牙语（`/es`）。明确的 URL 语言优先；无前缀入口依次按语言 Cookie、`Accept-Language`、默认 `zh` 协商。中文 HTML 与 hreflang 使用 `zh-Hans`。

缺译文时提供说明及有效入口，直接请求仍返回 404。搜索仅按需下载当前语言索引。同一 `courseId` / `lessonId` 的译文共享完成记录，统计与继续入口仅使用当前语言可读课时。进度保存在当前浏览器，存储受限时仍可阅读并获得提示。

## 写作与部署

[文档索引](./docs/README.md) 汇总 [作者指南](./docs/authoring.md)、[部署指南](./docs/deployment.md) 和 [实现与验收记录](./docs/implementation-notes.md)。详细指南目前使用中文。

生产 `SITE_URL` 应为已确认的 HTTPS 域名，环境变量见 `config/.env.example`。Vercel Preview 使用 `noindex`，课程范围与生产相同。Vercel 拒绝工程测试内容。正式部署前仍需完成 PRD 中剩余的发布门槛。

Quiz、视频嵌入、交互练习、提示与答案展开、提示词对比及其他 P1 继续延期，待真实写作需求明确后开发。

[PROTOCOL]: Update this header when making changes, then check README.md.
