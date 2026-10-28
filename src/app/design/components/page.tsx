/**
 * [INPUT]: Local JimmyNote, highlight, link-preview, chat, and table MDX examples, a fixed Chinese request locale/UI messages, shared MDX registry, and design preview chrome.
 * [OUTPUT]: Writing-component previews that remain available without published lessons.
 * [POS]: Writing-component preview outside the published course catalog.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import messages from '@/messages/zh.json';
import Examples from './examples.mdx';
import Tables from './tables.mdx';
import Chat from './chat.mdx';
import Highlights from './highlights.mdx';
import Links from './links.mdx';
import { getMDXComponents } from '@/components/mdx/components';
import { DesignFooter, DesignHeader } from '../ui';

export const metadata: Metadata = { title: { absolute: 'Writing components · AIDevCourse' } };

export default function ComponentPreview() {
  setRequestLocale('zh');
  return <>
    <DesignHeader />
    <NextIntlClientProvider locale="zh" messages={{ Ui: messages.Ui }}>
    <main id="main" className="mx-auto w-[min(760px,calc(100%-32px))] py-12">
      <h1 className="m-0 text-title leading-heading font-semibold tracking-tight">正文组件</h1>
      <h2 className="m-0 mt-8 text-2xl font-semibold">Jimmy Note</h2>
      <p className="mt-3 mb-8 text-base text-muted-foreground">用于正文里的个人观察和补充说明。</p>
      <Examples components={getMDXComponents()} />
      <section id="authoring" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-lg font-semibold">MDX 用法</h2>
        <pre tabIndex={0} role="region" aria-label="MDX 示例" className="m-0 overflow-x-auto rounded-md bg-muted p-4 font-mono text-caption leading-body"><code>{'<JimmyNote>\nAdd a personal observation here.\n\nA second paragraph can include **emphasis** and [links](https://example.com).\n</JimmyNote>'}</code></pre>
      </section>
      <section id="highlights" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">文字高亮</h2>
          <div className="course-prose prose" lang="zh-CN"><Highlights components={getMDXComponents()} /></div>
      </section>
      <section id="link-previews" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">链接预览</h2>
        <div className="course-prose prose" lang="zh-CN"><Links components={getMDXComponents()} /></div>
      </section>
      <section id="tables" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">表格</h2>
        <Tables components={getMDXComponents()} />
      </section>
      <section id="chat" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-2xl font-semibold">Chat Message</h2>
        <Chat components={getMDXComponents()} />
      </section>
    </main>
    </NextIntlClientProvider>
    <DesignFooter>正文组件预览</DesignFooter>
  </>;
}
