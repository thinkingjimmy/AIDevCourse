# 教程撰写助手（Tutorial Review）

一个 DSH Web 插件：在左侧栏增加「撰写」入口，按课程列出 `content/zh` 下的全部教程；
点击后在右侧只读渲染原文，并把审阅批注以 Notion 式划线批注显示在页边。

打开一篇教程时，它会自动在「审阅批注」里生成：
- 错别字 / 语句不通顺的校对建议；
- 相关内部章节建议；
- 权威外部资料建议。

这些结果会缓存在本地，切换教程或重新打开页面都不会重复生成；只有点击「刷新」或「重新审阅」才会重跑。
框选正文后仍可使用写作助手做**优化表达**和**扩写思路**。所有建议都只写入插件自己的数据，
**不会修改教程原文**。

## 功能

- 左侧课程 / 章节 / 教程三级导航，显示每篇的批注数（人工审阅 + 自动审阅建议），支持标题搜索。自动审阅完成后计数会即时更新，重新打开页面也会从缓存恢复。
- 只读渲染 Markdown 与本站常用的 MDX 组件：`Callout`、`KeyTakeaway`、`JimmyNote`、
  `JimmyNoteAnchor`、`Chat` 系列、`Steps`、`Achievement`、表格、代码块、图片等。
- 互动组件（`TokenizationDiagram`、`LLMGenerationDemo` 等）在审阅视图里显示为占位说明；
  原文仍可到课程站点查看完整互动。
- 页面顶部「刷新」会重新扫描目录、重新读取当前教程和批注；新增或修改 `.mdx` 后无需重启。
- 人工审阅、校对建议和内链 / 外链建议在右侧按**原文出现顺序**混排；点击划线定位右侧批注，点击右侧批注定位正文并让对应高亮闪烁。找不到引文的批注会排在列表末尾并标记「未定位」，不会丢失。
- 界面使用 shadcn 风格组件（Button / Badge / Card / Input / Skeleton）与 Tailwind CSS v4，颜色映射到 DSH 的 `--dsw-*` 主题 token，自动跟随明暗主题；宽屏三栏，窄屏导航与批注栏变为抽屉。
- **自动审阅**（打开教程后自动执行，无需点击）：
  - 错别字：红色卡片；
  - 语句不通顺：橙色卡片；
  - 校对卡片用 diff 展示：删除内容为红色删除线，新增内容为绿色；下方保留问题说明；
  - 内部链接建议：绿色卡片，可直接跳到对应章节；
  - 外部链接建议：蓝色卡片，在新标签页打开权威来源。
  - 每条链接建议都带当前教程中的原文片段，并在正文中划线定位；点击卡片会闪烁高亮。
  - 自动结果按教程内容版本缓存；切换教程、刷新页面都不会重复生成。
- 右侧「审阅批注」区顶部的「重新审阅」按钮会清掉当前教程缓存并重跑校对 + 内链 + 外链；工具栏「刷新目录」也会重新生成当前教程。
- **写作助手**（框选正文后出现悬浮菜单）：
  - `优化表达`：拆分长句、补主语、减少病句和错字，保留原意与术语。
  - `扩写思路`：读取上下文，给出 3–5 个有差异的扩写方向。
  - 结果进入右侧「写作助手」卡片，可一键复制；不会自动改写原文。

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
        locale: zh
```

## 数据流

Host 侧 `index.js` 注册四个同源只读接口，每次请求都重新读盘，不缓存：

| 接口 | 作用 |
| --- | --- |
| `/api/tutorial-review/manifest` | 按 `content/zh/meta.json` 的顺序扫描课程、章节和教程 |
| `/api/tutorial-review/doc?path=<lesson>` | 返回一篇 `.mdx` 原文和它的批注 |
| `/api/tutorial-review/asset?p=<src>&base=<lesson>` | 返回教程引用的图片（限制在 `public/` 与 `content/` 内） |
| `POST /api/tutorial-review/assist` | 写作助手与自动审阅：`review-enhance` 一次生成校对、内链、外链；`optimize` / `expand` 服务选区写作。外链会尝试 `ctx.web.search()` |

Client 侧 `client.js` 是构建产物：把 `src/loader.js` 连同 `unified` / `remark` 解析器
打包成 DSH 的 `window.__ModuleLoader__` 工厂。它注册两个槽位：

- `sidebar.panellist`：左侧栏「撰写」图标与标签。
- `main`：页面主体。`key` 与侧栏 `id` 都是 `tutorial-review`。

## 自动审阅与写作助手如何生成建议

- 模型调用走 DSH 的 `ctx.llm`，默认路由是 `deepseek-account` + `deepseek-flash`；可在 `cordis.patch.yml` 的 `provider` / `model` 字段覆盖。
- 打开教程时，Client 会检查 `localStorage` 里是否有与当前 `mtime` 一致的审阅快照；有就直接用，没有才调用一次 `review-enhance`，所以首次生成后切换教程/刷新页面不会重复消耗模型。
- 因此**每篇教程第一次打开会消耗一次模型调用**（外加一次可用的联网搜索）；之后都走缓存，直到点击「刷新」或「重新审阅」。
- `review-enhance` 用一次模型调用同时生成校对、内链、外链；Host 先跑关键词内链候选和外部搜索，再让模型只能从候选里选。
- 校对只检查错别字与语句通顺，不把写作风格偏好当成错误；引文必须在原文中真实存在，否则 Host 会丢弃该条结果。
- 如果模型输出被截断或不是合法 JSON，Host 会自动用更严格的格式要求重试一次，减少长教程校对时的格式失败。
- 点击右侧审阅区顶部的「重新审阅」或工具栏「刷新目录」会清掉当前教程快照并重新生成。
- 内链建议不会让模型凭空编造章节：Host 先按关键词（中文二元组 + 英文词）从其他教程中挑出 8 个候选，模型只能从候选 `lessonId` 中选择。每条建议还必须返回当前教程中的原文片段作为划线依据；引文不合法时 Host 会退回关键词匹配的句子。
- 外链建议优先调用 `ctx.web.search()`（需要在 DSH 中配置 Web Search）；同时会检索内置的 [`external-sources.json`](external-sources.json) 权威来源库。模型只能引用这两组候选中的 URL，不能编造链接；每条建议同样必须附带当前教程中的原文划线片段。
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

- 审阅视图是本站 MDX 的专用渲染器，不执行 MDX 中的 JS，也不会还原互动演示的动画。
- 站内链接在审阅视图里不跳转；外部链接在新标签页打开。
- 审阅批注是只读的，不提供在页面内新增 / 编辑人工审阅结论的 UI；人工审阅结论以 JSON 文件为准。自动审阅结果（校对 + 链接）按教程 `mtime` 缓存在浏览器 `localStorage`；手动写作助手卡片只在当前会话。
- 教程原文属于受保护内容，本插件不写入 `content/`。
- 外链建议依赖模型的判断与可用来源；内置来源库只覆盖常见 AI / 编程 / 设计主题，冷门主题可能返回空结果。
