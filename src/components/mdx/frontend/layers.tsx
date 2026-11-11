'use client';

import { useState, type ReactNode } from 'react';

const tools = ['视频工具', '绘图工具', '写作工具'];

export function FrontendLayersDemo() {
  const [added, setAdded] = useState(0);
  const visibleTools = tools.slice(0, added);
  const done = added === tools.length;

  return <figure data-frontend-layers aria-label="HTML、CSS 和 JavaScript 的逐步渲染案例" lang="zh-CN" className="not-prose my-8 grid gap-4 md:grid-cols-3">
    <Panel step="01" title="只有 HTML" note="有标题和按钮，但没有样式，同时按钮也无法点击">
      <div data-stage="html" className="min-h-48 rounded-sm bg-white p-4 font-serif text-foreground">
        <p className="m-0 text-xl font-bold">我的 AI 工具</p>
        <button type="button" className="mt-3 border border-[#767676] bg-[#efefef] px-2 py-0.5 font-serif text-sm">添加工具</button>
      </div>
    </Panel>
    <Panel step="02" title="加上 CSS" note="加上 CSS 后，按钮变得好看了，但按钮还不能点击">
      <div data-stage="css" className="min-h-48 rounded-sm bg-surface p-4">
        <div className="mx-auto w-full max-w-60">
          <p className="m-0 text-base font-semibold">我的 AI 工具</p>
          <button type="button" className="mt-3 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white">添加工具</button>
        </div>
      </div>
    </Panel>
    <Panel step="03" title="再加上 JavaScript" note="加上 JavaScript 后，可以点击按钮，点击一次，下方就会出现一张工具卡片">
      <div data-stage="js" className="min-h-48 rounded-sm bg-surface p-4">
        <div className="mx-auto w-full max-w-60">
          <p className="m-0 text-base font-semibold">我的 AI 工具</p>
          <button type="button" disabled={done} onClick={() => setAdded((current) => Math.min(current + 1, tools.length))}
            className="mt-3 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:cursor-default disabled:opacity-50">
            {done ? '已全部添加' : '添加工具'}
          </button>
          {visibleTools.length > 0 && <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
            {visibleTools.map((tool) => <li key={tool} data-tool className="rounded-md border border-border bg-background px-3 py-2 text-sm">{tool}</li>)}
          </ul>}
          <p role="status" className="sr-only">当前显示 {visibleTools.length} 个工具</p>
          <p className="mt-3 hidden text-caption leading-body text-muted-foreground [@media(scripting:none)]:block">启用 JavaScript 后，按钮才会新增工具卡片。</p>
        </div>
      </div>
    </Panel>
  </figure>;
}

function Panel({ step, title, note, children }: { step: string; title: string; note: string; children: ReactNode }) {
  return <section aria-label={`${step} ${title}`} className="flex min-w-0 flex-col overflow-hidden rounded-sm border border-border bg-background">
    <header className="border-b border-border px-4 py-3">
      <p className="m-0 flex items-baseline gap-2 text-sm font-semibold"><span className="font-mono text-caption text-brand">{step}</span>{title}</p>
      <p className="m-0 mt-1 text-caption leading-body text-muted-foreground">{note}</p>
    </header>
    <div className="flex flex-1 flex-col p-4">{children}</div>
  </section>;
}
