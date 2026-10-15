# 实现与验收记录

> L2 | Parent: [README.md](./README.md)

## 交付边界

本次从只有文档的仓库实现五语站点基础、内容管线、阅读体验、搜索、本地进度和发布检查。公开课程现为 AI 入门（`ai-101`），六个模块、31 篇课时；简体中文是原文，英文有已完成课文的全文，日文、法文和西班牙文是标题与摘要。未生成假作者、验证日期或生产域名。

PRD 的 M6 内容审校与公开发布、I-12 人工语言审校、M5-08 真机与系统输入法检查尚需负责人完成。CI 工作流已编写，但没有推送提交、执行 GitHub 远程 CI、连接 Vercel 或部署。延期的 T / P1 教学组件保持未实现。

## 锁定环境

| 项目 | 实际版本 |
| --- | --- |
| Node / pnpm | 22.17.0 / 10.30.3 |
| Next.js / React / React DOM | 16.3.6 / 19.3.0 / 19.3.0 |
| Fumadocs MDX / Core / UI | 15.4.3 / 16.15.13 / 16.15.13 |
| next-intl / Tailwind CSS | 4.14.6 / 4.3.3 |
| TypeScript / ESLint | 5.9.3 / 9.39.1 |
| Vitest / Playwright / axe-core | 5.0.1 / 1.63.0 / 4.13.0 |
| Lighthouse / ZBSearch | 13.5.0 / 4.0.0 |

所有直接依赖使用精确版本，pnpm lockfile 已生成。保留原 LICENSE。ESLint 与 TypeScript 使用当前框架组合实际通过的版本，不为追逐新主版本改动兼容组合。

## 文档与目录整理（v0.5）

项目默认入口为英文 [README.md](../README.md)，中文入口为 [README.zh.md](../README.zh.md)，两者内容和命令保持同步。PRD 移入 [docs/PRD.md](./PRD.md)，继续维护原任务编号和完成状态。

| 位置 | 职责与整理结果 |
| --- | --- |
| `content/<lang>/` | 真实课程直接按语言组织，减少一层目录 |
| `tests/fixtures/<lang>/` | 隔离样例与真实内容使用一致结构 |
| `src/components/mdx/` | 汇集唯一 MDX 注册入口和代码块组件 |
| `src/components/course/` | 课程布局与课程卡片、导航放在一起 |
| `src/components/progress/` | 进度 UI 与 `src/lib/progress` 使用一致命名 |
| `tests/unit/`、`tests/e2e/` | Vitest、Playwright 配置由对应测试目录维护 |
| `tsconfig.json` | 根目录提供编辑器和 TypeScript 默认可发现的入口 |
| `package.json` | 简单 PostCSS 插件配置集中于 `postcss` 字段，减少一个根配置文件 |

Next.js 支持从 [package.json 的 postcss 字段](https://nextjs.org/docs/pages/guides/post-css) 读取插件配置；当前锁定版本的 Turbopack 生产构建已实际通过。根目录保留 8 个维护文件，各目录 README 与源文件契约同步调整；内容稳定 ID 和学习记录协议没有变化。列入目录的课时都按普通课时公开。

公开课时 URL 不再包含模块段，形如 `/{lang}/courses/ai-101/{lesson}`。内容目录、大纲和 `meta.json` 仍按模块分组；同一课程内课时 slug 必须唯一。`config/redirects.json` 现为空，旧地址未对外分享，访问时返回 404。稳定课时 ID 和学习记录键 `lac:v1:{courseId}:lesson:{lessonId}` 不变。`/[lang]/courses` 课程列表已删除，该地址返回 404；原先指向列表的链接改为当前语言的 `ai-101` 课程页。

2026-09-23，整理后重新执行 `pnpm check`，38 个单元测试通过；`pnpm build`、`CONTENT_TEST=1 pnpm build` 均通过。三浏览器正式公开矩阵 27 项通过、隔离五语矩阵 69 项通过，共 96 项；仅跳过另一种构建专属测试。课程、样例和排序共 42 个文件与整理前逐字一致，文档本地链接、目录成员清单、L2/L3 契约、每目录文件数和 `git diff --check` 均通过。以下干净安装及性能数据属于 v0.4 的原始验收证据；此次整理未重测 Lighthouse。

## 接入与设计取舍

- 内容 collection 使用 `defineDocs` / `createMDX`，配置位于 `config/source.config.ts`。预检先扫描并过滤真实文件，再仅将公开文件交给编译器。`.source/catalog.json` 与 `.source/routes.json` 在构建时冻结；路由、SEO、统计和搜索只消费同一次公开清单。运行时不扫描工作目录。
- Fumadocs `loader` 使用目录语言 parser，明确关闭 fallback。应用通过 `getCourse(lang, slug)` / `getLesson(lang, course, segments)` / `getOrderedLessons` 等适配接口访问，不暴露内部 `.source` 给客户端。
- next-intl 只加载当前字典。共享语言白名单生成 HTML 标签、路由、Fumadocs 文案与 SEO。客户端只接收当前语言交互所需四个 namespace；正文保持服务端渲染。
- 只使用一个 `src/proxy.ts`。允许的无前缀入口私有 307 协商；明确语言不受 Cookie 影响。未知页面返回对应的静态错误文档，HTTP 状态为 404。锁定的 Next.js 版本里，重写状态会被页面的 200 覆盖，运行时 `notFound()` 又只给出需要 hydration 的空 HTML，因此由 proxy 取回已渲染的错误文档再以 404 送出。页面查询仍保留 notFound 防线。
- 复用 Fumadocs `DocsLayout`、`DocsPage`、TOC、正文、Shiki、Callout / Steps。课程侧栏局部替换，以统一 1024px 断点、完成标记和本语言统计；移动抽屉及重置确认复用 Radix 焦点管理。不修改 node_modules。
- 对比度以实际页面 axe 结果验证。纸色保留；代码块使用 Shiki 的浅色背景，避免默认语法红色在纸色上不足 4.5:1。复制动作等待 Clipboard Promise，再给本地化成功或失败反馈。
- Fumadocs 16.15.13 的实际搜索后端为 ZBSearch，使用 `createSearchAPI('advanced')` 静态导出与 `staticClient`。客户端和建库共用确定的 CJK 字符/双字组合及拉丁重音折叠，避免 Firefox 与 Node 的 ICU 分词差异。索引按语言与构建版本缓存，首次打开才下载，重试不复用失败 Promise。
- 学习记录只使用 `lac:v1:<courseId>:lesson:<lessonId>` 与课程 `last` 键；不包含语言。恢复完成后才允许写入；损坏和未知格式保护到显式重置，写失败使用当前会话内存。完成操作与最近访问分别写入，避免跨窗口覆盖整份课程对象。
- 课程 schema 增加 `goals`、`audience`、`prerequisites`，使总览实际内容完全由 MDX 维护。原文更新以 revision 提醒译文，不改变稳定 ID，不虚报工具验证。
- 文件按职责拆分，每个源文件保留 INPUT / OUTPUT / POS 和固定 PROTOCOL，目录 README 为地图；生成缓存不入 Git。

## 验证入口

| 验证 | 命令 / 证据 |
| --- | --- |
| 静态、内容、字典、单元 | `pnpm check`；5 份字典各 124 个消息键；35 个单元测试 |
| 正式公开边界 | `pnpm build` 与 `pnpm test:e2e`；中文课程进入页面、RSC、索引与 sitemap |
| 隔离五语课程 | `CONTENT_TEST=1 pnpm build` 与 `CONTENT_TEST=1 pnpm test:e2e` |
| 布局 | [五语、五视口截图](./evidence/screenshots/README.md)，320 / 390 / 768 / 1024 / 1440px 与 200% 等效缩放 |
| 性能 | [性能报告](./evidence/performance/report.json)，测量脚本记录环境、三次结果、中位数、请求与 gzip 索引 |
| CI 定义 | [.github/workflows/ci.yml](../.github/workflows/ci.yml)，远程执行待推送 |

单元覆盖身份/顺序/目录/引用/危险 MDX/日期、字典 ICU、语言优先级、索引分词、重定向和存储异常。浏览器矩阵覆盖五语真实页面、canonical/hreflang、缺译文、跨窗口完成与重置、搜索前五/锚点/重试/合成 IME、Axe、无 JS、图片失败、复制失败和暗色系统偏好。

自动化的 200% 等效缩放采用 1280px 物理宽度对应 640 CSS px、deviceScaleFactor 2 的视口，不声称完成物理手机、系统浏览器缩放或真实中文/日语输入法人工验证。Playwright WebKit 不能等同于用户设备上的 Safari；Lighthouse 本地模拟不是线上 Core Web Vitals。

## 最终执行结果

2026-09-23，在全新临时目录执行 `pnpm install --frozen-lockfile --offline`，安装耗时 5.3 秒；没有复制 node_modules、.source、.next 或 next-env。随后 check 成功（5 份字典 × 96 个消息、38 个单元测试），正式生产构建与隔离 fixture 构建均成功。

三浏览器正式公开矩阵 27 项通过，五语 fixture 矩阵 69 项通过，共 96 项。两个矩阵中只跳过另一种构建专属测试，没有跳过当前模式的验收项。最终矩阵含五语的五视口与 200% 等效缩放截图，共 30 张。直接 404 的实际 HTTP 状态、服务端 lang 和无 JS 正文都已验证。

部署保护会拒绝 Vercel fixture 模式、缺失生产域名、占位域名和带查询的生产 URL。完整执行输出见 [checks](./evidence/checks/README.md)。没有修改其他项目的服务；E2E 默认使用独立 3310 端口，冲突时可设 E2E_PORT。

GitHub Actions 文件已完成；以上记录均为实际本机执行，不能解读为远程 CI 或 Vercel 部署已完成。工作区改动尚未提交 Git commit。

## 已观察到的性能结果

2026-09-23，本机 Apple M3 Max / macOS Darwin 25.4.0 arm64，Node 22.17.0，Playwright Chromium 153.0.8010.12，Lighthouse 13.5.0 默认移动端模拟节流。对隔离生产 fixture 串行执行六个 URL、每个三次冷导航，共 18 次。所有报告均无 Lighthouse run warning。

| 页面 | 中文性能中位数 / LCP | 日语性能中位数 / LCP |
| --- | --- | --- |
| 首页 | 100 / 1.80 s | 100 / 1.80 s |
| 课程总览 | 99 / 2.11 s | 99 / 2.11 s |
| 代表课时 | 99 / 2.18 s | 99 / 2.18 s |

六页 CLS 中位数均为 0。首次加载记录 25–30 个请求，没有搜索索引请求，也没有字体服务、分析脚本或播放器请求。Fumadocs 阅读所需客户端模块按页面加载，搜索弹窗与索引在交互后加载。

| 语言 | 索引原始字节 | gzip 字节 |
| --- | ---: | ---: |
| en | 30,440 | 3,393 |
| zh | 110,161 | 8,154 |
| ja | 51,056 | 5,054 |
| fr | 38,785 | 3,827 |
| es | 34,056 | 3,610 |

这些是非公开 fixture 的实测值，不代表尚未发布的正式教程规模或真实移动网络体验。完整逐次指标和请求记录保存在 performance 目录；报告只做格式拆分，没有改写测量数值。

## 待发布前完成

按 PRD 保留未勾选的发布任务。作者仍需复核 AI 入门里已经写完的课文和各语言摘要，检查五语 UI，完成一次文档写作流程演练，确认品牌与域名；之后通过远程 CI 和 Vercel Preview，执行真机与正式站冒烟。

[PROTOCOL]: Update this header when making changes, then check README.md.
