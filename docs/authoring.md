# 作者与译者指南

> L2 | Parent: [README.md](./README.md)

课程只从 `content/<lang>/` 编译。网站页面无需逐篇修改。所有 todo 继续维护在 [PRD](./PRD.md#13-markdown-开发任务)。

## 本地启动

使用 Node 22.17.0 与 pnpm 10.30.3，执行 `pnpm install --frozen-lockfile`。`pnpm dev` 与部署展示同一份课程。新增文件、修改 frontmatter 或 meta 后重启开发服务以刷新公开清单；正文编辑支持热更新。

`CONTENT_TEST=1` 仅用于非公开工程验收，连接 Vercel 时会直接拒绝启动。

## 新增原文课程

1. 在 `content/zh/<course>/` 建立目录，复制 [课程模板](./templates/course-original.mdx) 为 `index.mdx`。更换所有示例文字与 ID；课程原文也可以使用其他受支持语言。
2. 填写 `sourceLocale`、本语言标题、简介、难度、目标 `goals`、受众 `audience` 和前置要求 `prerequisites`。写入 `content/` 并列入 `meta.json` 的文件即公开。
3. 为课程与每一层模块新增 `meta.json`，在语言根 meta 的 `pages` 中加入课程目录。每层 `pages` 只写直接成员的 ASCII 文件名或目录名，不带扩展名。
4. 从 [课时模板](./templates/lesson-original.mdx) 新增课时。`courseId` 匹配课程，`lessonId` 永久代表这一逻辑课时；修改标题、排序或路径时保留 ID。
5. 在模块 meta 中按教学顺序列出课时。课程 meta 包含 `index` 和各模块。不要通过文件名排序、通配符或数字前缀推断顺序。

```json
{
  "title": "Foundations",
  "pages": ["first-change", "useful-context"]
}
```

课程介绍不计入课时和时长。公开课程至少有一篇公开课时；完全没有课程的语言会显示本地化空状态。

## 编写与检查

标题从 frontmatter 渲染为唯一 h1，正文从 `##` 开始。支持普通 Markdown、表格、围栏代码、图片和 Fumadocs 的 `Callout`、`Steps`、`Step`。`.md` 与 `.mdx` 均通过统一 MDX 管线，同路径只能保留一种扩展名。

```mdx
<Callout title="Check the result" type="info">
Read the diff and verify the actual behavior.
</Callout>
```

组件只允许静态 `title` / `type` 字符串。禁止 import、JavaScript 表达式、原始 HTML、iframe、脚本和未知组件；代码围栏里的示例不会执行。注册入口为 `src/components/mdx/components.tsx`，不要为了单篇文章绕过校验器。

本地图片放到 `public/images/`，正文使用有意义的本语言 alt。编译器从图片读取宽高。这里的素材任何人都能访问，不能存放密钥或未公开的敏感素材。

```md
![The steps from a goal to a verified change](/images/courses/change-cycle.svg)
```

站内链接使用最终语言路径或当前文章 `#heading`。跨语言链接文字必须包含目标语言自称，例如 `[English: first change](/en/courses/ai-coding/foundations/first-change)`，且目标文件已经存在。不可链接不存在的课时或锚点。外部资料可用 HTTPS 链接，不做视频嵌入。

`durationMinutes` 是正整数阅读时长；`lessonType` 为 concept / practice / tool。工具操作课必须填写亲自验证的 `lastVerified` 和 `testedWith`。概念和文字练习不假造验证日期，不把编写日期当作工具验证日期。

```bash
pnpm content:check
pnpm i18n:check
pnpm check
pnpm build
```

这些命令校验全部文件的格式、身份、目录和字典，并验证课程引用。错误会带文件路径；缺译文是正常状态，落后于原文的译文会报告提醒。

## 新增译文

在目标语言建立相同课程、模块与课时路径，复制 [课程译文模板](./templates/course-translation.mdx) 和 [课时译文模板](./templates/lesson-translation.mdx)。保留原文的 `courseId`、`lessonId`、`sourceLocale` 和 ASCII 路径；翻译标题、正文、简介、目录名称、alt 与相关 UI 内容。

原文使用 `contentRevision`；译文只使用 `translatedFromRevision`，记录译文依据的原文版本。译文不能引用未来版本。目标语言 meta 只列已有文件，顺序是原文顺序的子序列。

缺译文的课时不存在，不复制原文到另一种语言目录冒充译文。切换菜单会明确说明将前往目标语言课程总览或课程列表。

原文发生实质变化时增加 `contentRevision`。旧译文可继续公开，但显示本地化更新提示和原文链接；译者核对后再更新 `translatedFromRevision`。改错字不需要重置学习记录。

## 发布、下架与改 URL

课程文件列入对应 `meta.json` 后即公开。检查 meta 完整，执行 check / build / 生产 E2E。请按 [部署指南](./deployment.md) 发布通过检查的提交。

下架时删除该语言的文件，并同步删除仍引用它的译文；目录中不再保留已删除的条目。原文文件不能在译文仍引用时直接移除。没有课时的课程介绍无法通过校验。

已发布 URL 变化时同步所有语言的相对路径，保持稳定 ID，并在 `config/redirects.json` 添加旧 URL 到实际公开新 URL 的映射。不能有链式跳转、环、动态匹配或外部目标。

```json
[
  {
    "source": "/en/courses/ai-coding/foundations/old-name",
    "destination": "/en/courses/ai-coding/foundations/first-change"
  }
]
```

上面的 JSON 只说明字段形状。真实迁移写在 `config/redirects.json`：目前是 `ai-coding` 到 `ai-101`。不要用示例覆盖这份映射。只有发生新的 URL 迁移时才追加条目。

## 互动需求

选择题、视频播放器、交互练习、答案展开和提示词对比继续延期。先用文字写清文章目标，再在 PRD 的 T 系列记录具体需求、真实材料、预期行为和验收条件；不要提前创建空组件。

公开课程是 `content/zh/ai-101`（AI 入门）：六个模块、31 篇课时，列入目录的课都按普通课时公开。其中六篇参考课文和两篇并入的旧课有全文；其余课时目前是两句摘要。英文对应课文有全文或摘要，日文、法文、西班牙文目前是标题和摘要。旧地址在 `config/redirects.json`：`/zh/courses/ai-coding` 以及原来的三篇课时，分别跳到 `ai-101` 的课程页、`safety/first-workflow`、`context/useful-context` 和 `checking/verify-results`。工程 fixture 仍使用 `tests/fixtures` 里的 `ai-coding`，只用于测试。

[PROTOCOL]: Update this header when making changes, then check README.md.
