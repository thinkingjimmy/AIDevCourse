# 教程审阅（Tutorial Review）

一个 DSH Web 插件：在左侧栏增加「审阅」入口，按课程列出 `content/zh` 下的全部教程；
点击后在右侧只读渲染原文，并把审阅批注以 Notion 式划线批注显示在页边。

原文不会被改写。批注保存在插件自己的 `annotations/` 目录，和教程源码分离。

## 功能

- 左侧课程 / 章节 / 教程三级导航，显示每篇的批注数，支持标题搜索。
- 只读渲染 Markdown 与本站常用的 MDX 组件：`Callout`、`KeyTakeaway`、`JimmyNote`、
  `JimmyNoteAnchor`、`Chat` 系列、`Steps`、`Achievement`、表格、代码块、图片等。
- 互动组件（`TokenizationDiagram`、`LLMGenerationDemo` 等）在审阅视图里显示为占位说明；
  原文仍可到课程站点查看完整互动。
- 页面顶部「刷新」会重新扫描目录、重新读取当前教程和批注；新增或修改 `.mdx` 后无需重启。
- 批注按正文出现顺序编号；点击划线定位右侧批注，点击右侧批注定位正文。找不到引文的批注
  会进入「未定位批注」，不会丢失。
- 仅使用 DSH 的 `--dsw-*` 主题 token，自动跟随明暗主题；宽屏三栏，窄屏导航与批注栏变为抽屉。

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

Host 侧 `index.js` 注册三个同源只读接口，每次请求都重新读盘，不缓存：

| 接口 | 作用 |
| --- | --- |
| `/api/tutorial-review/manifest` | 按 `content/zh/meta.json` 的顺序扫描课程、章节和教程 |
| `/api/tutorial-review/doc?path=<lesson>` | 返回一篇 `.mdx` 原文和它的批注 |
| `/api/tutorial-review/asset?p=<src>&base=<lesson>` | 返回教程引用的图片（限制在 `public/` 与 `content/` 内） |

Client 侧 `client.js` 是构建产物：把 `src/loader.js` 连同 `unified` / `remark` 解析器
打包成 DSH 的 `window.__ModuleLoader__` 工厂。它注册两个槽位：

- `sidebar.panellist`：左侧栏「审阅」图标与标签。
- `main`：页面主体。`key` 与侧栏 `id` 都是 `tutorial-review`。

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
- 匹配时会折叠空白，所以跨换行的句子也能匹配；但引文必须落在同一个正文块内。
- 修改批注后点页面上的「刷新」即可，不需要重启 DSH。
- 新增教程但没有批注文件也正常显示，只是批注数为 0。

校验全部批注的引文、分类、长度和路径：

```sh
node plugins/tutorial-review/scripts/validate-annotations.mjs
```

## 开发

修改 `src/` 后重新构建 `client.js`（esbuild 来自本仓库的依赖）：

```sh
cd plugins/tutorial-review
../../node_modules/.bin/esbuild src/loader.js \
  --bundle --format=iife --platform=browser --target=es2022 \
  --outfile=client.js --log-level=warning
```

Host 侧 `index.js` 是普通 ESM，不需要构建。改 Host 逻辑后需要让 DSH 重新加载该插件
（使用插件管理器关闭再开启，或重启 DSH）；只改批注 JSON 不需要。

## 已知限制

- 审阅视图是本站 MDX 的专用渲染器，不执行 MDX 中的 JS，也不会还原互动演示的动画。
- 站内链接在审阅视图里不跳转；外部链接在新标签页打开。
- 批注是只读的，不提供在页面内新增 / 编辑批注的 UI；审阅结论以 JSON 文件为准。
- 教程原文属于受保护内容，本插件不写入 `content/`。
