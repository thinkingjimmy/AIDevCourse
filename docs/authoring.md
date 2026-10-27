# 作者与译者指南

> L2 | Parent: [README.md](./README.md)

课程只从 `content/<lang>/` 编译。网站页面无需逐篇修改。当前产品行为见 [需求说明](./requirements.md)，数据流见 [架构说明](./architecture.md)。

## 本地启动

使用 Node 22.17.0 或更新的 22.x 补丁版本与 pnpm 10.30.3，执行 `pnpm install --frozen-lockfile`。`pnpm dev` 与部署展示同一份课程。新增文件、修改 frontmatter 或 meta 后重启开发服务以刷新公开清单；正文编辑支持热更新。

`CONTENT_TEST=1` 仅用于非公开工程验收，连接 Vercel 时会直接拒绝启动。

## 新增原文课程

1. 在 `content/zh/<course>/` 建立目录，复制 [课程模板](./templates/course-original.mdx) 为 `index.mdx`。更换所有示例文字与 ID；课程原文也可以使用其他受支持语言。
2. 填写 `sourceLocale`、本语言标题、简介、难度、目标 `goals`、受众 `audience` 和前置要求 `prerequisites`。课程总览由这些字段和课时目录生成，课程文件无需正文。写入 `content/` 并列入 `meta.json` 的文件即公开。
3. 为课程与每一层模块新增 `meta.json`，在语言根 meta 的 `pages` 中加入课程目录。每层 `pages` 只写直接成员的 ASCII 文件名或目录名，不带扩展名。
4. 从 [课时模板](./templates/lesson-original.mdx) 新增课时。`courseId` 匹配课程，`lessonId` 永久代表这一逻辑课时；修改标题、排序或路径时保留 ID。
5. 在模块 meta 中按教学顺序列出课时。课程 meta 包含 `index` 和各模块。不要通过文件名排序、通配符或数字前缀推断顺序。

```json
{
  "title": "Foundations",
  "pages": ["first-change", "useful-context"]
}
```

课程介绍不计入课时数量。课程可以先发布介绍，再逐步添加课时。没有课时的课程保留首页卡片和总览，显示「内容更新中」，不显示开始第一课或课时统计。完全没有课程的语言会显示本地化空状态。

## 编写与检查

标题从 frontmatter 渲染为唯一 h1，正文从 `##` 开始。支持普通 Markdown、表格、围栏代码、图片，以及 `Callout`、`JimmyNote`、`Chat`、`ChatMessage`、`Steps`、`Step`、`LLMGenerationDemo`、`MenuComparisonDemo`、`Achievement`、`AchievementOption`。`.md` 与 `.mdx` 均通过统一 MDX 管线，同路径只能保留一种扩展名。

```mdx
<Callout title="Check the result" type="info">
Read the diff and verify the actual behavior.
</Callout>
```

`JimmyNote` 用于个人观察或补充说明，显示浅灰底和固定的深色「Jimmy」标签。正文支持多段文字、强调和链接，无需 import。可在 [组件预览](http://localhost:3000/design/components) 检查样式。

```mdx
<JimmyNote>
Add a personal observation here.

Use **emphasis** and [links](https://example.com) when useful.
</JimmyNote>
```

`ChatMessage` 用于文章里的静态对话示例，参考 [shadcn Message](https://ui.shadcn.com/docs/ai-elements/radix/message) 的布局。组件复用引用块的黑色直角边框和右下偏移阴影，并保留内边距；`from="user"` 显示右侧灰色气泡及圆形用户图标头像，`from="assistant"` 显示左侧浅色描边气泡及机器人头像。两种头像共用浅灰底和灰色图标。头像随消息角色自动显示，无需配置图片。正文支持多段 Markdown、强调和链接，无需 import 或 JavaScript。

用 `<Chat>` 包住多条消息，可在同一个外框里展示完整对话；单独使用 `ChatMessage` 时会显示自己的外框。

```mdx
<Chat>
<ChatMessage from="user">
What is an LLM?
</ChatMessage>

<ChatMessage from="assistant">
An LLM generates text from the context you provide.
</ChatMessage>
</Chat>
```

`ChatMessage` 的 `state` 配置决定显示状态。默认 `state="complete"` 显示正常回复气泡；`from="assistant" state="thinking"` 参考 [shadcn Reasoning](https://ui.shadcn.com/docs/ai-elements/radix/reasoning) 的状态行，显示 LLM 头像、旋转指示和 Thinking 文字，不带消息气泡，也无需填写正文。它只展示文章里的思考状态示意，不调用模型。系统开启减少动态效果时停止旋转；无 JavaScript 时仍可阅读。

```mdx
<Chat>
  <ChatMessage from="user">What is an LLM?</ChatMessage>
  <ChatMessage from="assistant" state="thinking" />
</Chat>
```

`ChatMessage` 接受必填的静态 `from="user"` 或 `from="assistant"`，以及可选的 `state="complete"` 或 `state="thinking"`；thinking 只用于 assistant。`Chat` 不接受参数；`Achievement` 和 `AchievementOption` 的字段见下方「文章成就」。其他组件只允许静态 `title` / `type` 字符串。禁止 import、JavaScript 表达式、原始 HTML、iframe、脚本和未知组件；代码围栏里的示例不会执行。注册入口为 `src/components/mdx/components.tsx`，不要为了单篇文章绕过校验器。

本地图片放到 `public/images/`，正文使用有意义的本语言 alt。编译器从图片读取宽高。这里的素材任何人都能访问，不能存放密钥或未公开的敏感素材。

```md
![The steps from a goal to a verified change](/images/courses/change-cycle.svg)
```

站内链接使用最终公开路径或当前文章 `#heading`。英文使用 `/courses/...`，其他语言保留前缀，如 `/zh/courses/...`；禁止在正文链接中使用 `/en` 别名。课时公开地址不含模块，例如 `/zh/courses/ai-101/strengths`；同一课程内课时 slug 必须唯一。跨语言链接文字必须包含目标语言自称，例如 `[English: What AI is good at](/courses/ai-101/strengths)`，且目标文件已经存在。不可链接不存在的课时或锚点。课程总览只渲染元数据和目录，支持 `#course-catalog`；课程介绍正文中的标题不会渲染，不能作为锚点。课程列表位于语言首页，`/{lang}/courses` 不存在。外部资料可用 HTTPS 链接，不做视频嵌入。

文章 frontmatter 只填写 `courseId`、`lessonId`、`title` 和 `description`。`lessonId` 是稳定身份，修改标题或文件名时保持不变。类型由文件位置自动推导：课程根目录的 `index.mdx` / `index.md` 是课程介绍，其他已排序文章是课时。不要手填 `kind`，也无需维护阅读时长、文章分类、验证日期或修订版本。

```bash
pnpm content:check
pnpm i18n:check
pnpm check
pnpm build
```

这些命令校验全部文件的格式、身份、目录和字典，并验证课程引用。错误会带文件路径；缺译文是正常状态。

## 新增译文

在目标语言建立相同课程、模块与课时路径，复制 [课程译文模板](./templates/course-translation.mdx) 和 [课时译文模板](./templates/lesson-translation.mdx)。保留原文的 `courseId`、`lessonId`、`sourceLocale` 和 ASCII 路径；翻译标题、正文、简介、目录名称、alt 与相关 UI 内容。

目标语言 meta 只列已有文件，顺序是原文顺序的子序列。系统按稳定身份关联译文，不使用人工修订号判断内容是否同步。

缺译文的课时不存在，不复制原文到另一种语言目录冒充译文。切换菜单会明确说明将前往目标语言课程总览或首页。

原文更新后由作者核对译文。站点不显示译文版本提示；修改正文不重置阅读记录或成就。

## 发布、下架与改 URL

课程文件列入对应 `meta.json` 后即公开。检查 meta 完整，执行 check / build / 生产 E2E。请按 [部署指南](./deployment.md) 发布通过检查的提交。

下架时删除该语言的文件，并同步删除仍引用它的译文；目录中不再保留已删除的条目。原文文件不能在译文仍引用时直接移除。没有课时的课程介绍可以继续公开，并显示内容更新状态。

已发布 URL 变化时同步所有语言的相对路径，保持稳定 ID，并在 `config/redirects.json` 添加旧 URL 到实际公开新 URL 的映射。不能有链式跳转、环、动态匹配或外部目标。

```json
[
  {
    "source": "/courses/ai-101/old-name",
    "destination": "/courses/ai-101/strengths"
  }
]
```

上面的 JSON 只说明字段形状。真实迁移写在 `config/redirects.json`，目标必须已经公开。只有发生 URL 迁移时才追加条目，不要用示例覆盖现有映射。

## 互动需求

中文版「What a language model does」使用 `<LLMGenerationDemo />` 展示固定虚构回答的自动逐字生成过程，使用 `<MenuComparisonDemo />` 比较原生选择控件与 shadcn 风格菜单。这两个组件不接受参数，无需 import，也不调用模型或外部接口。生成演示逐轮显示完整输入和候选概率，选择概率最高的字符后，将它接入下一轮输入，再向上换行。组件内提供暂停、继续播放和重新播放；离开可视区域或切换到后台时暂停计时，减少动态效果模式下直接显示完整结果，无 JavaScript 时提供可展开的静态说明。菜单支持键盘操作和独立的选择反馈。中文版 `what-a-language-model-does.mdx` 通过通用 `<Achievement>` 声明「分清生成与查证」。它保留原有引用边框、原生单选交互和解锁反馈；稳定身份为 `ai-101:what-a-language-model-does:generation-vs-verification`，成就使用课程内独立的存储键，已有解锁记录继续生效。

### 文章成就

新增成就只需在文章 MDX 中填写题目和选项，无需修改 TSX、注册组件或维护成就总数。开发环境修改成就声明后重启 `pnpm dev`，以重新生成经过校验的文章定义与课程清单。

```mdx
<Achievement
  id="check-the-source"
  title="Source checker"
  question="The model has no live weather data. What can you conclude?"
  answer="verify"
  explanation="Specific details do not prove a weather lookup."
  takeaway="Check the source before trusting the numbers."
>
  <AchievementOption value="trust">It knows the current weather.</AchievementOption>
  <AchievementOption value="verify">The weather still needs checking.</AchievementOption>
</Achievement>
```

题目直接显示 `question`，不需要额外的标题字段；`title` 仅用作解锁后的成就名称。所有字段均为必填的静态非空字符串。`id` 和选项 `value` 使用小写 ASCII 单词及连字符；同一课程内 `id` 唯一。至少提供两个不同 `value` 的选项，`answer` 必须匹配其中一个。选项仅支持纯文本，字母序号由组件自动生成。不要手填序号、使用表达式或添加自定义 JSX；校验会拒绝不完整、重复或无正确答案的题目。只能放在课时文章中，不能放在不渲染正文的课程介绍中。

原文定义决定课程成就清单和 Sidebar 圆环的总数。译文可以暂不加入题目；加入时必须放在对应课时，保留相同的 `id`、选项 `value` 和 `answer`，只翻译展示文本。同一课程跨语言共享数量。标题、URL 和选项顺序改变不影响解锁记录；发布后不要复用或随意更换成就 ID。

挑战以「🥇 成就挑战」和 `question` 开始。答错显示带错误图标的「回答不正确」与 `explanation`，允许重新选择。答对自动记录成就并更新 Sidebar，立即显示只包含成就名称 `title`、`takeaway` 和「再试一次」按钮的成就卡片，无需额外点击。解释只在答错或无 JavaScript 的展开说明中显示。成就卡片提供「再试一次」：清空本次选项与反馈，将焦点放回答题选项，允许再次答错或答对。重试不撤销成就、不修改首次解锁时间，也不增加统计。已解锁后刷新直接显示成就卡片。界面提示有五语字典。刷新恢复、同源标签页同步、存储失败时的页面内保存和减少动态效果设置均由通用组件处理。无 JavaScript 时显示问题与可展开的解释，不能解锁或保存。

计分考试、视频播放器、其他交互练习和提示词对比暂不实现。现有组件不足时，先记录真实材料、输入、状态、失败处理和验收条件，并更新 [需求说明](./requirements.md)。不要提前创建空组件。

当前 AI 101 发布五语课程介绍、中文版「What a language model does」正文与其他语言的欢迎占位文档，分别位于 `content/<lang>/ai-101/index.mdx` 与 `what-a-language-model-does.mdx`。课时的稳定 ID 为 `what-a-language-model-does`，用于关联最近访问与成就，不依赖课时标题或 URL。首页「马上学习」按 `meta.json` 中的顺序进入第一课。新增课时需在 `pages` 中列出对应文件或模块，课时 URL 为 `/{lang}/courses/ai-101/{lesson}`。`tests/fixtures` 中的 `ai-coding` 只用于工程验证，不属于公开课程。

[PROTOCOL]: Update this header when making changes, then check README.md.
