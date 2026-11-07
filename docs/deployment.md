# 部署与回滚

仓库提供 Vercel 标准 Next.js 配置和 GitHub Actions 工作流。实际部署状态以远程项目、CI 结果和发布记录为准。产品范围见 [需求说明](./requirements.md)。

## 环境

开发、CI 和 Vercel 统一使用 Node **24.x**、pnpm **10.30.3**。`package.json` 的 Node 范围限制为 24.x，避免 Vercel 根据宽泛范围选择另一个主版本。Vercel 会自动更新该主版本的补丁版本，不能固定为本地的某一个补丁版本。字体随固定版本的 Fontsource 依赖安装，开发和构建无需访问 Google Fonts。

在 Vercel 导入 Git 仓库后，使用以下设置：

| 设置 | 值 |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | 仓库根目录 |
| Node.js Version | 24.x |
| Install Command | 使用自动检测，不添加覆盖命令 |
| Build Command | 使用框架默认值，执行 `pnpm build` |
| Output Directory | 使用框架默认值 `.next` |

无需 `vercel.json`、静态导出、自定义服务器或单独的上传脚本。Vercel 按 Next.js 的默认输出部署。

在项目的环境变量设置中启用 **System Environment Variables**，并添加以下变量：

| 变量 | 环境 | 值 |
| --- | --- | --- |
| `ENABLE_EXPERIMENTAL_COREPACK` | Production、Preview | `1`，使 Vercel 使用 `packageManager` 中固定的 pnpm 版本 |
| `SITE_URL` | Production | 已验证的最终 HTTPS origin |

不要手动设置 Vercel 提供的 `VERCEL_ENV`、`VERCEL_URL`，也不要设置 `CONTENT_TEST`。不需要数据库、模型 API key 或翻译服务。环境变量变更后，需要重新构建部署。

生产的 `SITE_URL` 不带路径、账号、端口、查询参数或片段。构建会拒绝缺失值、HTTP、IP 地址、本地域名和示例域名。该检查只验证格式；域名所有权和 Vercel 域名状态仍须在项目中确认。仓库没有预设生产域名。

Preview 使用 Vercel 提供的 `https://VERCEL_URL` 作为 canonical、hreflang 和 sitemap 的 origin；即使 Preview 继承了生产 `SITE_URL`，也优先使用部署地址。Preview 的响应头和页面 metadata 均为 `noindex, nofollow`，`robots.txt` 禁止抓取。noindex 不是身份验证，需要限制访问时使用 Vercel Deployment Protection。

本地可将 `config/.env.example` 复制到根目录 `.env.local`。本地默认 origin 是 `http://localhost:3000`，并保持 noindex。实际环境文件不提交。

## 构建前检查

```bash
pnpm install --frozen-lockfile
pnpm deployment:check
pnpm check
pnpm build
pnpm test:e2e tests/e2e/deployment --project=chromium
```

`pnpm deployment:check` 使用 Next.js 的生产环境文件加载规则，检查 Node、pnpm、部署 origin 和测试内容隔离。`pnpm check`、`pnpm build` 已包含该检查。结果写入 `.artifacts/deployment/environment-public.json`；隔离测试内容使用 `environment-fixtures.json`。报告只记录运行版本、公开 origin、内容模式和检查结果，不导出环境变量。

Next.js 的 MDX 集成在构建时生成 `.source` 中的模块、公开目录和路由清单。无需提交生成文件，也无需在 Vercel 配置额外的生成步骤。页面和搜索使用编译后的 MDX 与构建目录。Next.js 自动生成依赖追踪；当前内容无需额外的 `outputFileTracingIncludes`。运行时新增文件读取时，应重新验证依赖追踪。

部署 E2E 检查真实生产构建中的五语入口、MDX、搜索、canonical、hreflang、sitemap、robots、旧英文地址重定向和 404；同时通过独立 CLI 环境检查无效 origin 与测试内容部署拦截。HTML 报告、JSON 证据和截图保存在 `.artifacts/e2e/public/`。可用 `pnpm test:e2e:report` 查看。CI 会上传这些文件和部署检查报告。

## 发布门槛

1. 作者确认品牌、域名、作者身份与首发文章，并确认准备发布的原文和译文已在 `content/` 中。
2. 执行 `pnpm audit --prod`、`pnpm check`、`pnpm build`、`pnpm test:e2e`。解决高危或严重依赖公告。隔离内容能力另用 `CONTENT_TEST=1 pnpm build` 和 `CONTENT_TEST=1 pnpm test:e2e` 验证。
3. 推送经检查的提交，在 GitHub 检查 Quality 工作流。分支保护需仓库管理员设置，本文不宣称已启用。
4. 在 Vercel Preview 复查五语入口、真实课程、缺译文空状态、SEO、搜索和成就，再从同一提交创建 Production 部署。生产构建使用 Production 的 `SITE_URL`；不要直接把按 Preview 环境构建的产物绑定到生产域名，因为静态页面保留了预览 origin 和 noindex。
5. 记录提交 SHA、部署 URL、生产域名、发布时间、实际内容覆盖和上一可用部署 ID。

只有部署构建使用正常 `pnpm build`；禁止把 `.next-test` 当作生产产物。CI 最后一阶段的 fixture 构建仅用于测试，不存在从 CI 上传它到 Vercel 的步骤。

## 上线冒烟

检查 `/` 按 Cookie / Accept-Language 自动识别语言：英文直接返回 200，其他语言使用私有、不可缓存的 307。检查 `/about` 与 `/courses/...` 始终为英文，其他语言保留前缀，`/en/...` 直接跳到无前缀地址。检查 canonical、hreflang、sitemap、搜索和原生语言切换链接使用同一套公开地址。检查五语首页、课程总览、关于页；只有已有译文的语言应有文章链接。逐一检查真实原文、已有译文、缺译文 404、搜索、成就答错重试与解锁、刷新恢复、跨语言共享、存储失败提示和移动布局。检查侧栏成就入口可用，课末完成操作保存记录，并进入下一章或课程总览。

生产 canonical 使用最终域名，hreflang 只列真实存在的版本；sitemap 只含实际课程，不含测试标记，robots 允许正式站点抓取。实际 Safari、手机和系统中日输入法仍须人工检查，Playwright WebKit 和合成 composition 事件不能替代这一步。

## 回滚

在 Vercel 将上一可用部署重新提升为生产，并记录回滚原因、时间和部署 ID。不要运行浏览器存储清理，不要重置用户学习记录。回滚后重做上述冒烟，检查域名、缓存、语言协商和已恢复的文章范围。内容版本较旧时可能重新出现文章，但稳定 ID 仍用于关联浏览器学习记录；不要将旧完成标记转换为成就。

回滚目标须为已通过生产构建检查的部署，且其 `SITE_URL` 与当前生产域名一致。

## 官方依据

- [Vercel Node.js 版本](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)：主版本选择、`engines` 优先级和补丁更新。
- [Vercel 包管理器](https://vercel.com/docs/package-managers) 与 [Corepack 设置](https://vercel.com/docs/builds/configure-a-build#corepack)：自动检测与固定 pnpm 版本。
- [Vercel 系统环境变量](https://vercel.com/docs/environment-variables/system-environment-variables)：`VERCEL_ENV`、`VERCEL_URL` 的含义和启用方式。
- [Next.js 环境变量](https://nextjs.org/docs/app/guides/environment-variables)：环境文件加载规则。
- [Next.js 输出与依赖追踪](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)：部署文件追踪和额外包含规则。
