# 部署与回滚

仓库提供 Vercel 标准 Next.js 配置和 GitHub Actions 工作流。实际部署状态以远程项目、CI 结果和发布记录为准。产品范围见 [需求说明](./requirements.md)。

## 环境

生产环境使用 Node 22.x（最低 22.17.0，CI 固定 22.17.0）、pnpm 10.30.3；本地开发也支持 Node 24.x。字体随固定版本的 Fontsource 依赖安装，开发和构建无需访问 Google Fonts。Vercel Framework Preset 选择 Next.js，Root Directory 为仓库根目录；Install Command 为 `pnpm install --frozen-lockfile`，Build Command 为 `pnpm build`，Output Directory 使用框架默认值。

生产环境设置 `SITE_URL` 为最终 HTTPS origin，不带路径、查询参数或片段。代码在 `VERCEL_ENV=production` 时拒绝缺失、占位或非 HTTPS 域名。`config/.env.example` 说明本地变量，实际环境文件不提交。

预览默认使用本地/预览 origin 并返回 noindex，课程范围与生产相同。不要设置 `CONTENT_TEST`：它在 Vercel 中被拒绝。noindex 不是身份验证。

## 发布门槛

1. 作者确认品牌、域名、作者身份与首发文章，并确认准备发布的原文和译文已在 `content/` 中。
2. 执行 `pnpm audit --prod`、`pnpm check`、`pnpm build`、`pnpm test:e2e`。解决高危或严重依赖公告。隔离内容能力另用 `CONTENT_TEST=1 pnpm build` 和 `CONTENT_TEST=1 pnpm test:e2e` 验证。
3. 推送经检查的提交，在 GitHub 检查 Quality 工作流。分支保护需仓库管理员设置，本文不宣称已启用。
4. 在 Vercel Preview 复查五语入口、真实课程、缺译文空状态、SEO、搜索和成就，再将同一提交提升为生产。
5. 记录提交 SHA、部署 URL、生产域名、发布时间、实际内容覆盖和上一可用部署 ID。

只有部署构建使用正常 `pnpm build`；禁止把 `.next-test` 当作生产产物。CI 最后一阶段的 fixture 构建仅用于测试，不存在从 CI 上传它到 Vercel 的步骤。

## 上线冒烟

检查 `/` 按 Cookie / Accept-Language 自动识别语言：英文直接返回 200，其他语言使用私有、不可缓存的 307。检查 `/about` 与 `/courses/...` 始终为英文，其他语言保留前缀，`/en/...` 直接跳到无前缀地址。检查 canonical、hreflang、sitemap、搜索和原生语言切换链接使用同一套公开地址。检查五语首页、课程总览、关于页；只有已有译文的语言应有文章链接。逐一检查真实原文、已有译文、缺译文 404、搜索、成就答错重试与解锁、刷新恢复、跨语言共享、存储失败提示和移动布局。检查 Sidebar 只显示 🥇 成就数量，课末没有完成按钮。

生产 canonical 使用最终域名，hreflang 只列真实存在的版本；sitemap 只含实际课程，不含测试标记，robots 允许正式站点抓取。实际 Safari、手机和系统中日输入法仍须人工检查，Playwright WebKit 和合成 composition 事件不能替代这一步。

## 回滚

在 Vercel 将上一可用部署重新提升为生产，并记录回滚原因、时间和部署 ID。不要运行浏览器存储清理，不要重置用户学习记录。回滚后重做上述冒烟，检查域名、缓存、语言协商和已恢复的文章范围。内容版本较旧时可能重新出现文章，但稳定 ID 仍用于关联浏览器学习记录；不要将旧完成标记转换为成就。
