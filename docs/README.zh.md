**简体中文** · [English](../README.md)

# AIDevCourse

一门面向初学者的大语言模型与 AI 编程课程。先理解基本概念，再尝试用 AI 做出简单的网页和应用。没有编程基础也可以开始。

课程开源，仍在持续更新。目前以中文内容为主；英文、日文、法文和西班牙文已有课程介绍，以及 LLM 101 三个模块的全部十四节译文。其他课程翻译尚不完整。

## 从哪里开始

先读[「关于这门课」](../content/zh/getting-started/before-you-start/about-this-course.mdx)，了解课程适合谁，以及如何开始学习。

| 课程 | 学习内容 | 当前进度 |
| --- | --- | --- |
| 从想法到作品 | 学习起点、方法与思考 | 已有内容，持续补充 |
| 博客 | AI 工具、行业趋势与企业落地的观察 | 已收录两篇文章 |
| LLM 101 | 语言模型、训练、Chat、工具调用与 Agent 入门 | 三个模块均有五语版本 |
| Coding 101 | 用 AI 完成网站，从前端到部署 | 更新中，多数课时仍为占位文档 |
| 设计 101 | 设计基础 | 课时准备中 |
| Agent 101 | 在入门知识之上继续学习 Agent | 课时准备中 |

网站提供交互示例、设计、动效与编程术语词典，以及成就练习。学习进度保存在当前浏览器中。阅读无需注册账号，也无需模型 API Key。

## 作者与更新

作者是 [Jimmy](https://jimmywong.dev)。可以通过以下渠道关注课程更新，以及 AI 相关的分享：

[X](https://x.com/thinkingjimmy) · [Bilibili](https://space.bilibili.com/1409205119) · [小红书](https://www.xiaohongshu.com/user/profile/6073d38d00000000010068a6)

## 一起完善课程

不写代码，也可以参与。欢迎用中文或英文提交 Issue。提交前，先搜索已有问题，避免重复。

- **提问：**遇到不理解的概念，或对项目有疑问，可以[提交问题](https://github.com/thinkingjimmy/aidevcourse/issues/new?template=01-question.yml)，说明你想了解什么。也可以先[查看已有提问](https://github.com/thinkingjimmy/aidevcourse/issues?q=is%3Aissue%20label%3Aquestion)。
- **纠错建议：**发现错别字或不准确的解释，可以[提交纠错建议](https://github.com/thinkingjimmy/aidevcourse/issues/new?template=02-correction.yml)。请附上页面位置和相关原文；有建议改法或参考资料，也欢迎补充。[查看已有纠错建议](https://github.com/thinkingjimmy/aidevcourse/issues?q=is%3Aissue%20label%3Acorrection)。

其他建议或网站故障，可以[新建 Issue](https://github.com/thinkingjimmy/aidevcourse/issues/new/choose)。希望修改课程或代码，请先阅读[贡献指南](../.github/CONTRIBUTING.md)。

## 本地运行

在本地仓库中，使用 Node **24.x** 和 pnpm **10.30.3**：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

打开 [localhost:3000/zh](http://localhost:3000/zh)。无需配置数据库或第三方服务密钥。

安装、命令与验证步骤见[贡献指南](../.github/CONTRIBUTING.md)。编写课程与翻译见[作者指南](./authoring.md)，实现细节见[架构说明](./architecture.md)，发布步骤见[部署指南](./deployment.md)。作者指南和部署指南使用中文。

采用 [MIT 许可证](../LICENSES/MIT.txt)。

## 致谢

感谢 [Index 的设计词典](https://index.how/to/articulate)提供的术语参考，以及交互式排版和色彩案例灵感。

感谢 [Emil Kowalski 的动效词典](https://animations.dev/vocabulary#entrances-and-exits)提供的进入与退出动效术语。交互示例在本项目中独立实现。
