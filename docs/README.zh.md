# AIDevCourse

本地写作、五语阅读的 AI 编程学习网站。

[English](../README.md) · **简体中文**

Next.js 16.3.8 + React 19.3.0 + Fumadocs MDX 15.4.3 / Core & UI 16.15.13 + next-intl 4.14.6 + Tailwind CSS 4.3.3

支持本地 Markdown / MDX 课程、当前语言搜索和浏览器成就与最近学习位置。无需账号、数据库、模型 API Key 或在线翻译服务。

**内容状态：**LLM 101 提供五语课程介绍。中文版十一篇教程分为「大语言模型的工作原理」（四篇）、「模型的训练与能力」（预训练、深度思考、多模态、开源模型与本地运行、模型选择五篇）、「AI 应用的工作原理」（AI Chat 与工具调用两篇）三个模块；其他语言保留第一课的欢迎占位文档。移动模块不改变公开链接或成就记录。LLM 101 保持入门难度，不安排后训练教程；Chat 使用方法随对应原理课讲解，Agent 101 规划为独立中级课程，尚未发布。后续方向见[作者指南](./authoring.md#llm-101-的课程范围)。首页「马上学习」直接进入第一课。Coding 101 提供两节中文入门课：用书包清单认识 JSON，再用任务单理解 AI API 调用；包含可选 curl 实操和两项成就。工程样例与公开课程分开管理。

## 快速启动

使用 Node **22.17.0 或更新的 22.x 补丁版本，或 24.x**、pnpm **10.30.3**。CI 和生产环境继续使用 Node 22.x。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

打开 [localhost:3000/zh](http://localhost:3000/zh)。正文支持热更新。修改 frontmatter、成就声明、文件路径或 `meta.json` 排序后，重启开发服务。

英文入口为 `/`，英文关于页和课程使用 `/about`、`/courses/...`；其他语言保留 `/zh`、`/ja`、`/fr`、`/es` 前缀。只有首页 `/` 根据已保存的选择、浏览器语言、默认英文的顺序识别语言。`/design` 提供设计稿，`/design/components` 提供正文组件预览。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 使用 Webpack 启动开发服务 |
| `pnpm check` | 检查目录、lint、类型、内容、字典和现有单元测试 |
| `pnpm audit --prod` | 查询生产依赖的当前安全公告 |
| `pnpm build` | 校验并构建公开课程 |
| `pnpm start` | 启动生产构建 |
| `pnpm test:e2e tests/e2e/navigation.spec.ts --project=chromium` | 构建后验证受影响的导航模块 |
| `pnpm test:e2e:report` | 打开公开构建的 HTML 测试报告 |
| `pnpm measure:performance` | 测量 3200 端口的服务，从 sitemap 读取有效页面 |

首次执行 `pnpm exec playwright install chromium firefox webkit` 安装浏览器。开发时只运行受影响模块的 E2E。发布前运行完整矩阵：

```bash
pnpm check
pnpm build
pnpm test:e2e
CONTENT_TEST=1 pnpm build
CONTENT_TEST=1 pnpm test:e2e
```

以上环境变量写法适用于 POSIX shell。PowerShell 使用 `$env:CONTENT_TEST = '1'`，完成后移除该变量。

E2E 自动启动 **3310** 端口的服务；端口冲突时设置 `E2E_PORT`。样例构建位于 `.next-test`，不能部署到 Vercel。报告、trace、截图和性能数据统一位于 Git 忽略的 `.artifacts/`，正式内容与样例报告分别保存。

## 目录地图

| 目录 | 职责 |
| --- | --- |
| [`src/`](../src/) | 路由、组件、业务逻辑、字典和样式 |
| [`content/`](../content/) | 按语言组织的公开课程 |
| [`config/`](../config/) | MDX、lint、重定向和环境示例 |
| [`tests/`](../tests/) | 浏览器测试、现有单元测试和隔离样例 |
| [`scripts/`](../scripts/) | 内容、字典检查和性能测量 |
| [`public/`](../public/) | 图标和课程图片 |
| [`docs/`](./) | 当前需求、架构、写作、部署和模板 |
| [`.github/`](../.github/) | CI 和贡献规范 |

路由负责组合组件；内容与语言规则分别位于 `src/lib/content` 和 `src/lib/i18n`。较小的业务模块直接放在 `src/lib`。基础组件直接放在 `src/components/ui`，弹层放在 `overlays`。侧边栏属于课程模块。两种插图共用动画驱动。

维护的源码文件不超过 800 行，每层目录不超过八个维护文件。

## 贡献与部署

先阅读 [贡献指南](../.github/CONTRIBUTING.md)。一般问题提交到 [GitHub issues](https://github.com/thinkingjimmy/aidevcourse/issues)，敏感问题按 [安全政策](../.github/SECURITY.md) 处理。

[需求说明](./requirements.md) 定义当前行为，[架构说明](./architecture.md) 说明模块边界和数据流。[作者指南](./authoring.md) 说明课程 ID、翻译和 MDX 约束。[部署指南](./deployment.md) 说明 `SITE_URL`、发布检查和回滚。生产环境使用已确认的 HTTPS origin；环境示例位于 `config/.env.example`。Preview 使用 `noindex`。

作者通过 MDX 的 Achievement 和 AchievementOption 声明题目与成就，系统自动收集课程成就清单。同一课程的译文通过稳定 ID 共享成就。缺译文时链接到有效课程或目标语言首页。存储失败时仍可阅读。

采用 [MIT 许可证](../LICENSE)。
