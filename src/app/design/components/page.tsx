/**
 * [INPUT]: Local JimmyNote and table MDX examples, shared MDX registry, and design preview chrome.
 * [OUTPUT]: Writing-component previews that remain available without published lessons.
 * [POS]: Writing-component preview outside the published course catalog.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { Metadata } from 'next';
import Examples from './examples.mdx';
import Tables from './tables.mdx';
import { getMDXComponents } from '@/components/mdx/components';
import { DesignFooter, DesignHeader } from '../ui';

export const metadata: Metadata = { title: { absolute: 'Writing components · AIDevCourse' } };

export default function ComponentPreview() {
  return <>
    <DesignHeader />
    <main id="main" className="mx-auto w-[min(760px,calc(100%-32px))] py-12">
      <h1 className="m-0 text-[32px] leading-[1.2] font-semibold tracking-[-.02em]">正文组件</h1>
      <h2 className="m-0 mt-8 text-[24px] font-semibold">Jimmy Note</h2>
      <p className="mt-3 mb-8 text-[16px] text-muted-foreground">用于正文里的个人观察和补充说明。</p>
      <Examples components={getMDXComponents()} />
      <section id="authoring" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-[18px] font-semibold">MDX 用法</h2>
        <pre tabIndex={0} role="region" aria-label="MDX 示例" className="m-0 overflow-x-auto rounded-md bg-muted p-4 font-mono text-[13px] leading-[1.7]"><code>{'<JimmyNote>\nAdd a personal observation here.\n\nA second paragraph can include **emphasis** and [links](https://example.com).\n</JimmyNote>'}</code></pre>
      </section>
      <section id="tables" className="mt-10 border-t border-border pt-6">
        <h2 className="m-0 mb-3 text-[24px] font-semibold">表格</h2>
        <Tables components={getMDXComponents()} />
      </section>
    </main>
    <DesignFooter>正文组件预览</DesignFooter>
  </>;
}
