'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowCounterClockwise';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { editedTitle, initialTitle } from './inspector/model';

const escapeHTML = (text: string) => text.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]!);

export function FrontendInspectorPractice() {
  const target = useRef<HTMLParagraphElement>(null);
  const titleId = useId();
  const captionId = useId();
  const [draft, setDraft] = useState(editedTitle);
  const [title, setTitle] = useState(initialTitle);
  const textChanged = title !== initialTitle;
  const source = `<p id="frontend-playground-title">\n  ${escapeHTML(title)}\n</p>`;
  const status = textChanged ? '文字已修改。' : '右键检查这个标题，或用输入框试改。';

  useEffect(() => {
    const element = target.current!;
    const observer = new MutationObserver(() => setTitle(element.textContent ?? ''));
    observer.observe(element, { characterData: true, childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  function reset() {
    target.current!.textContent = initialTitle;
    setDraft(editedTitle);
  }

  return <figure data-frontend-inspector-practice aria-labelledby={captionId} lang="zh-CN" className="not-prose my-8 overflow-hidden rounded-sm border border-border bg-background text-foreground">
    <figcaption id={captionId} className="border-b border-border px-4 py-4 text-base font-semibold sm:px-5">动手练习：改掉这个标题</figcaption>
    <div className="p-4 sm:p-5">
      <div className="overflow-hidden rounded-sm border border-border">
        <div className="flex items-center justify-between gap-3 bg-surface px-4 py-2 text-caption text-muted-foreground"><span>右键下方标题 → 检查</span><Button variant="plain" size="reset" onClick={reset} className="min-h-11 shrink-0 gap-1.5 [@media(scripting:none)]:hidden"><ArrowCounterClockwiseIcon aria-hidden size={14} />恢复原样</Button></div>
        <div className="bg-white px-4 py-5">
          {/* Stable initial props preserve external DevTools edits during React updates. */}
          <p ref={target} id="frontend-playground-title" className="m-0 min-h-9 text-2xl font-semibold text-brand [overflow-wrap:anywhere]">{initialTitle}</p>
        </div>
        <pre className="m-0 whitespace-pre-wrap border-t border-border bg-surface p-4 font-mono text-sm leading-body [overflow-wrap:anywhere]"><code data-inspector-source>{source}</code></pre>
      </div>
      <p role="status" className="mb-3 mt-3 text-sm leading-body text-brand" data-edited={textChanged}>{status}</p>
      <form className="[@media(scripting:none)]:hidden" onSubmit={(event) => { event.preventDefault(); target.current!.textContent = draft; }}>
        <label htmlFor={titleId} className="mb-2 block text-sm font-medium">新的标题文字</label>
        <div className="flex flex-wrap items-start gap-2">
          <Input id={titleId} value={draft} maxLength={100} onChange={(event) => setDraft(event.target.value)} autoComplete="off" spellCheck={false} data-1p-ignore className="h-11 min-w-0 basis-full text-base md:text-base sm:flex-1 sm:basis-48" />
          <Button type="submit" variant="action" size="action" className="rounded-sm">修改文字</Button>
        </div>
      </form>
      <p className="mb-0 mt-3 text-caption text-muted-foreground">这里只修改你看到的页面。</p>
    </div>
  </figure>;
}
