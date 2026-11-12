import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { NextProvider } from 'fumadocs-core/framework/next';
import { isLocale } from '@/lib/i18n/config';
import Examples from './examples.mdx';
import Tables from './tables.mdx';
import Chat from './chat.mdx';
import ToolCalls from './tools.mdx';
import Highlights from './highlights.mdx';
import MathExamples from './math/examples.mdx';
import MermaidExamples from './mermaid/examples.mdx';
import Links from './links.mdx';
import ResourceExamples from './resources/examples.mdx';
import Takeaways from './takeaways.mdx';
import CodeExamples from './code/examples.mdx';
import Embeds from './embeds/examples.mdx';
import { getMDXComponents } from '@/components/mdx/components';
import { InlineCitation } from '@/components/mdx/chat/inline-citation';
import { NoteRail, NoteScope } from '@/components/mdx/notes/note-scope';
import { DesignFooter, DesignHeader } from '../ui';

export const metadata: Metadata = { title: { absolute: 'Writing components · AIDevCourse' } };

export default async function ComponentPreview({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const locale = isLocale(lang) ? lang : 'zh';
  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  return <>
    <DesignHeader />
    <NextIntlClientProvider locale={locale} messages={{ Ui: messages.Ui, Author: messages.Author }}>
    <NextProvider>
    <main id="main" className="mx-auto w-[min(760px,calc(100%-32px))] py-12">
      <h1 className="m-0 text-title leading-heading font-semibold tracking-tight">正文组件</h1>
      <section id="jimmy-notes" className="mx-[calc((100%-min(65.5rem,100vw-2rem))/2)] mt-8 w-[min(65.5rem,calc(100vw-2rem))] @container/lesson">
        <h2 className="m-0 text-2xl font-semibold">Jimmy Note</h2>
        <p className="mt-3 mb-8 text-base text-muted-foreground">浅绿色高亮关联作者批注；右下折线接入直角卡片，空间不足时点击数字上标阅读，编号按正文顺序自动生成。</p>
        <NoteScope className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-x-8 @[64rem]/lesson:grid-cols-[minmax(0,1fr)_21rem]">
          <article className="course-prose prose"><Examples components={getMDXComponents()} /></article>
          <NoteRail />
        </NoteScope>
      </section>
      <section id="key-takeaways" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">划重点</h2>
        <p className="m-0 text-base text-muted-foreground">把需要记住的结论放在这里。</p>
        <div className="course-prose prose" lang="zh-CN"><Takeaways components={getMDXComponents()} /></div>
        <pre tabIndex={0} role="region" aria-label="KeyTakeaway MDX example" className="m-0 mt-6 overflow-x-auto rounded-md bg-muted p-4 font-mono text-caption leading-body"><code>{'<KeyTakeaway>\n**Remember this conclusion.**\n</KeyTakeaway>'}</code></pre>
      </section>
      <section id="authoring" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-lg font-semibold">MDX 用法</h2>
        <pre tabIndex={0} role="region" aria-label="MDX 示例" className="m-0 overflow-x-auto rounded-md bg-muted p-4 font-mono text-caption leading-body"><code>{'Read <JimmyNoteAnchor id="context">this text</JimmyNoteAnchor>.\n\n<JimmyNote anchor="context">\nAdd a personal observation here.\n\nA second paragraph can include **emphasis** and [links](https://example.com).\n</JimmyNote>'}</code></pre>
      </section>
      <section id="code-folding" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">代码块</h2>
        <div className="course-prose prose"><CodeExamples components={getMDXComponents()} /></div>
      </section>
      <section id="highlights" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">文字高亮</h2>
          <div className="course-prose prose" lang="zh-CN"><Highlights components={getMDXComponents()} /></div>
      </section>
      <section id="math" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">数学公式</h2>
        <NoteScope><div className="course-prose prose" lang="zh-CN"><MathExamples components={getMDXComponents()} /></div></NoteScope>
      </section>
      <section id="mermaid" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">Mermaid 图表</h2>
        <div className="course-prose prose" lang="zh-CN"><MermaidExamples components={getMDXComponents()} /></div>
      </section>
      <section id="link-previews" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">链接预览</h2>
        <div className="course-prose prose" lang="zh-CN"><Links components={getMDXComponents()} /></div>
      </section>
      <section id="resource-disks" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">资源卡片</h2>
        <div className="course-prose prose"><ResourceExamples components={getMDXComponents()} /></div>
      </section>
      <section id="tables" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">表格</h2>
        <Tables components={getMDXComponents()} />
      </section>
      <section id="chat" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">Chat Message</h2>
        <Chat components={getMDXComponents()} />
      </section>
      <section id="chat-tools" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">工具调用</h2>
        <ToolCalls components={getMDXComponents()} />
      </section>
      <section id="inline-citations" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">行内引用</h2>
        <p className="m-0 text-base leading-reading">这是一段带有来源的教学示例<InlineCitation url="https://www.weather.com.cn/weather/101280101.shtml" title="广州天气预报 · 中国天气网" description="查看广州天气预报，核对日期、气温和天气情况。" />，可以悬停或聚焦查看来源，并点击打开原站。</p>
      </section>
      <section id="embeds" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">X · YouTube</h2>
        <div className="course-prose prose"><Embeds components={getMDXComponents()} /></div>
      </section>
    </main>
    </NextProvider>
    </NextIntlClientProvider>
    <DesignFooter>正文组件预览</DesignFooter>
  </>;
}
