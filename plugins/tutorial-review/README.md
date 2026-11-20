# 教程撰写助手（Tutorial Review）

一个 DSH Web 插件：在左侧栏增加「撰写」入口，按课程列出 `content/zh` 下的全部教程；
打开后默认进入 MDX 源码编辑器，可以直接修改并保存原文；输入 `/` 快速插入本站的 MDX 组件；
右侧栏顶部并排的「校对 / 内链 / 外链」按钮按需生成审阅建议，结果保存在浏览器本地。

## 功能

- 左侧课程 / 章节 / 教程三级导航，显示每篇的批注数（人工审阅 + 已生成的审阅建议），支持标题搜索。
- **MDX 源码编辑**：主区域默认是纯文本编辑器，直接编辑 `content/zh/**/*.mdx`。
  - 中间栏为左编辑、右预览的分栏布局；右侧默认嵌入真实站点预览（已保存内容），保存后自动刷新。
  - 点击「审阅视图」可切回本地实时草稿渲染，用于划线和批注定位。
  - 点击顶栏「保存」或按 `⌘S` / `Ctrl+S` 写回原文件；保存前比较文件 `mtime`，如果文件已在磁盘上被外部修改，
    会提示冲突并提供「重新加载」。
  - 有未保存修改时切换教程会弹出确认，可选择「保存并切换」「放弃修改」或「取消」。
  - 未保存的修改会同步到浏览器 `localStorage`，刷新页面或暂时切走面板后可以恢复；「还原」会舍弃草稿并恢复到磁盘版本。
  - `Tab` 插入两个空格，编辑器底部显示字数和行数。
- **`/` / `、` 快捷插入组件**：在行首、空白后或中文标点 / 汉字后输入 `/` 或 `、`，弹出组件菜单；继续输入可过滤，
  `↑` / `↓` 选择，`Enter` 或 `Tab` 插入，`Esc` 关闭；不再提供单独的「插入组件」按钮。
  - 嵌入：`XEmbed`、`YouTube`、`WebsitePreview`
  - 选择 `WebsitePreview` 会先打开弹窗：URL 可留空（默认使用 `https://aidevcourse.com`，组件中显示该域名），
    可粘贴/选择图片，或直接确定由 Playwright 自动截图；图片保存到 `public/images/websites/`。
  - 对话：`Chat`、`Chat input`、`ChatMessage`、`ChatThinking`
  - 提示与批注：`Callout`、`KeyTakeaway`、`JimmyNote`、`JimmyNoteAnchor`
  - Markdown：标题、列表、表格、代码块、图片、链接、分隔线
- **右侧栏顶部 Review 按钮**：`校对`、`内链`、`外链` 三个按钮并排，点击才触发对应的模型审阅，不会在打开教程时自动消耗模型。
  - 校对检查错别字和语句不通顺；内链推荐其他教程章节；外链检索权威外部资料。
  - 每个任务完成后立即写入浏览器 `localStorage`，按教程 `mtime` 缓存；重新打开页面会恢复。
  - 保存教程后内容版本变化，当前教程的审阅缓存会被清空，需要重新点击按钮。
- **Sidebar 布局**：左侧课程导航和右侧审阅栏都使用 shadcn 风格的 `Sidebar` 组件（`SidebarProvider` / `Sidebar` / `SidebarInset` / `SidebarMenuButton`），并与 DSH 主题 token 对齐；右侧栏顶部默认显示 Review 操作按钮，不再显示「审阅批注」标题、数量或筛选条。
- **审阅批注**：人工审阅结论（`plugins/tutorial-review/annotations/`）与 AI 审阅建议在右侧按原文出现顺序混排；
  点击划线定位右侧批注，点击右侧批注定位正文并让对应高亮闪烁。找不到引文的批注会排在列表末尾并标记「未定位」。
- **写作助手**（在右侧预览区框选正文后出现悬浮菜单）：
  - `优化表达`：拆分长句、补主语、减少病句和错字，保留原意与术语。
  - `扩写思路`：读取上下文，给出 3–5 个有差异的扩写方向。
  - 结果进入右侧「写作助手」卡片，可一键复制；不会自动改写原文。
- 真实站点预览复用本站的 MDX 组件与样式；本地审阅视图渲染 Markdown 与 `Callout`、`KeyTakeaway`、`JimmyNote`、
  `JimmyNoteAnchor`、`Chat` 系列、`Steps`、`Achievement`、表格、代码块、图片等。
- 互动组件（`TokenizationDiagram`、`LLMGenerationDemo` 等）在预览里显示为占位说明；
  原文仍可到课程站点查看完整互动。
- 页面顶部「刷新」会重新扫描目录、重新读取当前教程和批注；新增或修改 `.mdx` 后无需重启。
- 界面使用 shadcn 风格组件（Button / Badge / Card / Input / Skeleton）与 Tailwind CSS v4，颜色映射到 DSH 的 `--dsw-*` 主题 token，
  自动跟随明暗主题；宽屏三栏，窄屏导航与批注栏变为抽屉。

## 安装（桌面版 DSH）

从本仓库安装到 `desktop` profile：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add /Users/jimmywong/Documents/aidevcourse/plugins/tutorial-review
```

这条命令会写入 profile 的依赖，并把 `@local/dsh-tutorial-review` 加到
`~/.dsh/profiles/desktop/package.json` 的 `dsh.profile.bundles` 末尾。刷新 DSH 页面即可。
如果使用 DSH 的 **Plugins → Add plugin** 界面安装本地目录，安装器也会完成同样的两步。

`cordis.patch.yml` 里的 `root` 默认写死为本仓库路径。换目录时只改这一处：

```yaml
- insert:
    - id: tutorial-review
      name: '@local/dsh-tutorial-review'
      config:
        root: /Users/jimmywong/Documents/aidevcourse
        siteUrl: http://localhost:3000
        locale: zh
```

## 数据流

Host 侧 `index.js` 注册五个同源接口，每次请求都重新读盘，不缓存：

| 接口 | 作用 |
| --- | --- |
| `/api/tutorial-review/manifest` | 按 `content/zh/meta.json` 的顺序扫描课程、章节和教程，并返回 `siteUrl` |
| `/api/tutorial-review/doc?path=<lesson>` | 返回一篇 `.mdx` 原文、`mtime`、批注和 `sitePath`（文件名 slug 与站点 URL 一致；`index` 指向课程页） |
| `POST /api/tutorial-review/save` | 保存一篇 `.mdx`；带 `expectedMtime`，版本不一致时返回 409 |
| `/api/tutorial-review/asset?p=<src>&base=<lesson>` | 返回教程引用的图片（限制在 `public/` 与 `content/` 内） |
| `POST /api/tutorial-review/assist` | 写作助手与审阅：`proofread`、`internal-links`、`external-links`、`optimize`、`expand` 等任务；外链会尝试 `ctx.web.search()` |

Client 侧 `client.js` 是构建产物：把 `src/loader.js` 连同 `unified` / `remark` 解析器
打包成 DSH 的 `window.__ModuleLoader__` 工厂。它注册两个槽位：

- `sidebar.panellist`：左侧栏「撰写」图标与标签。
- `main`：页面主体。`key` 与侧栏 `id` 都是 `tutorial-review`。

## 审阅与写作助手如何生成建议

- 模型调用走 DSH 的 `ctx.llm`，默认路由是 `deepseek-account` + `deepseek-flash`；可在 `cordis.patch.yml` 的 `provider` / `model` 字段覆盖。
- 打开教程时**不会**自动跑审阅。点击右侧栏顶部按钮才会调用对应任务：
  - `校对` → `proofread`，`scope: lesson`；
  - `内链` → `internal-links`，`scope: lesson`；
  - `外链` → `external-links`，`scope: lesson`。
- 每个任务成功后按 `dsh.tutorial-review.review.v3:<lessonId>:<kind>` 写入 `localStorage`，
  值是 `{ mtime, generatedAt, data }`。只有 `mtime` 与当前文件一致才恢复；所以切换教程或刷新页面不会重复消耗模型。
- 保存修改后 `mtime` 变化，当前教程的审阅缓存会被清空；需要重新点击按钮。
- 校对只检查错别字与语句通顺，不把写作风格偏好当成错误；引文必须在原文中真实存在，否则 Host 会丢弃该条结果。
- 如果模型输出被截断或不是合法 JSON，Host 会自动用更严格的格式要求重试一次，减少长教程校对时的格式失败。
- 内链建议不会让模型凭空编造章节：Host 先按关键词（中文二元组 + 英文词）从其他教程中挑出 8 个候选，模型只能从候选 `lessonId` 中选择。
  每条建议还必须返回当前教程中的原文片段作为划线依据；引文不合法时 Host 会退回关键词匹配的句子。
- 外链建议优先调用 `ctx.web.search()`（需要在 DSH 中配置 Web Search）。如果本地插件目录提供 `external-sources.json`，
  也会检索其中的权威来源。模型只能引用候选中的 URL，每条建议必须附带当前教程中的原文划线片段。
- 如果联网搜索未配置或暂时失败，会退回内置来源库；如果模型不可用，会返回候选来源或关键词匹配的内链，并在卡片上标注「降级结果」。
- 所有 AI 结果都只是建议，不会自动改写原文；采用前请人工核对。校对只检查错别字与语句通顺，不替代事实核查。

## 添加或修改批注

每篇教程对应一个 JSON，路径与教程相同：

```
content/zh/llm-101/model-fundamentals/what-is-a-token.mdx
plugins/tutorial-review/annotations/zh/llm-101/model-fundamentals/what-is-a-token.json
```

格式见 [`annotations/SCHEMA.md`](annotations/SCHEMA.md)。最小示例：

```json
{
  "path": "coding-101/what-is-json",
  "reviewedAt": "2026-11-04",
  "annotations": [
    {
      "id": "whitespace-not-data",
      "quote": "换行和缩进是为了让人容易阅读。把它排得整齐，不会改变里面的资料。",
      "category": "表述过宽",
      "comment": "空白只在字符串之外没有意义……"
    }
  ]
}
```

- `quote` 必须是渲染后的纯文本，不能带 `**`、`==`、反引号或 JSX 标签；在页面中出现一次。
- 匹配时会忽略空白，所以跨换行或 Markdown 转换产生的空格也能匹配；但引文必须落在同一个正文块内。
- 修改批注后点页面上的「刷新」即可，不需要重启 DSH。
- 新增教程但没有批注文件也正常显示，只是批注数为 0。

校验全部批注的引文、分类、长度和路径：

```sh
node plugins/tutorial-review/scripts/validate-annotations.mjs
```

## 开发

界面用 **shadcn 风格的 React 组件 + Tailwind CSS v4** 构建：

- `src/ui.js`：Button / Badge / Card / Input / Skeleton 等 shadcn 风格基础组件，基于 `clsx` + `tailwind-merge`；
- `src/plugin.css`：Tailwind 主题，把 `--dsw-*` 主题 token 映射成 `bg-tr-*` / `text-tr-*` / `border-tr-*`；
- `src/generated-css.js`：由 Tailwind 编译生成，构建时注入插件 `<style>`。

修改 `src/` 后重新构建：

```sh
cd plugins/tutorial-review
npm run build
```

这会先编译 Tailwind CSS，再用 esbuild 打包 `client.js`。esbuild 来自本仓库依赖。

### 为什么不直接 import 站点里的 shadcn 组件

插件是 DSH 的客户端 IIFE，必须复用 Host 注入的 React 实例；而站点里的
`src/components/ui/*.tsx` 使用 `@/` 路径别名、`radix-ui` 和站点自己的 Tailwind
token（`bg-background`、`text-ui` 等）。直接 import 会把站点构建、Radix 和另一个
React 实例带进插件，并让插件依赖站点源码。

所以 `src/ui.js` 按 shadcn 的组件结构、`data-slot`、variants 和组成方式实现，
但渲染函数使用 Host 的 React；Tailwind 仍然照常编译。这样插件可以独立安装、升级。

Host 侧 `index.js` 是普通 ESM，不需要构建。改 Host 逻辑后需要让 DSH 重新加载该插件
（使用插件管理器关闭再开启，或重启 DSH）；只改批注 JSON 不需要。

## 已知限制

- 编辑器是纯文本 MDX 源码编辑，不提供富文本 / WYSIWYG、图片上传或可视化表格编辑。
- 保存只写入当前打开的已有 `.mdx`，不支持新建、重命名或删除文件。
- 真实站点预览需要课程站运行在 `siteUrl`（默认 `http://localhost:3000`），并重新启动一次站点以加载 embed 路由和 frame headers。
- iframe 预览显示已保存内容；未保存草稿请在「审阅视图」查看。
- 本地审阅视图里站内链接不跳转；真实站点预览内链接正常跳转。
- 人工审阅批注仍是只读的，以 JSON 文件为准；AI 审阅结果与写作助手建议按教程 `mtime` 缓存在浏览器 `localStorage`。
- 保存会直接修改 `content/zh` 下的教程原文，这是本插件的预期行为；保存前请确认内容。
