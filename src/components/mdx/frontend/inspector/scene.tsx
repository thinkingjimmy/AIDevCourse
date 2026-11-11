'use client';

import { useLayoutEffect, useRef } from 'react';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { CursorIcon } from '@phosphor-icons/react/dist/ssr/Cursor';
import { CursorTextIcon } from '@phosphor-icons/react/dist/ssr/CursorText';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { SelectionIcon } from '@phosphor-icons/react/dist/ssr/Selection';
import { cursorStops, frameAt } from './model';
import styles from './scene.module.css';

export function InspectorScene({ time, playing = false }: { time: number; playing?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const frame = frameAt(time);
  const { storyTime } = frame;
  const panelProgress = Math.max(0, Math.min(1, (storyTime - 2850) / 300));
  const menuProgress = Math.max(0, Math.min(1, (storyTime - 1200) / 180));

  useLayoutEffect(() => {
    const stage = root.current;
    if (!stage || !cursor.current) return;
    const point = (target: string) => {
      const bounds = stage.getBoundingClientRect();
      const node = stage.querySelector<HTMLElement>(`[data-inspector-target="${target}"]`)!;
      const box = node.getBoundingClientRect();
      return { x: box.left - bounds.left + Math.min(box.width / 2, 32), y: box.top - bounds.top + box.height / 2 };
    };
    const position = () => {
      const after = cursorStops.findIndex((stop) => stop.time > storyTime);
      const next = after < 0 ? cursorStops.at(-1)! : cursorStops[after];
      const previous = cursorStops[Math.max(0, (after < 0 ? cursorStops.length - 1 : after) - 1)];
      const from = point(previous.target);
      const to = point(next.target);
      const progress = next.time === previous.time ? 1 : Math.max(0, Math.min(1, (storyTime - previous.time) / (next.time - previous.time)));
      const eased = progress * progress * (3 - 2 * progress);
      cursor.current!.style.transform = `translate3d(${from.x + (to.x - from.x) * eased}px, ${from.y + (to.y - from.y) * eased}px, 0)`;
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [storyTime]);

  return <div ref={root} data-inspector-scene data-scene-time={time} data-scene-step={frame.step} className={styles.scene} aria-hidden>
    <div className={styles.toolbar}>
      <span className={styles.lights}><i /><i /><i /></span>
      <span className={styles.refresh}><ArrowClockwiseIcon size={16} /></span>
      <span className={styles.address}><LockSimpleIcon size={12} /><span>当前网页</span></span>
    </div>

    <div className={styles.preview}>
      <span className="text-caption font-medium tracking-wide text-[#59636e]">AI TOOLS</span>
      <p data-inspector-preview-title data-inspector-target="title" data-highlighted={frame.hoveringTitle} className={`${styles.previewTitle} mb-0 mt-3 text-2xl font-semibold text-brand`}>{frame.title}</p>
      <p className="mb-0 mt-2 text-sm text-[#59636e]">找到你的下一个好工具。</p>
      <div className={styles.cards}>
        {['Writing', 'Images'].map((label, index) => <div key={label} className={styles.card}><span className="text-sm font-medium">{label}</span><span className={styles.line} style={{ width: index ? '58%' : '76%' }} /><span className={styles.line} style={{ width: index ? '80%' : '54%' }} /></div>)}
      </div>
      <div className={styles.filler}><span className={styles.line} /><span className={styles.line} /></div>
      <div data-inspector-menu className={styles.menu} data-open={frame.menu} style={{ opacity: frame.menu ? menuProgress : 0, transform: `translateY(${(1 - menuProgress) * -6}px)` }}>
        <div className={styles.menuMuted}>返回 <span>⌘ [</span></div>
        <div className={styles.menuMuted}>重新加载 <span>⌘ R</span></div>
        <div className={styles.menuRule} />
        <div data-inspector-target="inspect" className={styles.inspectItem} data-active={frame.inspectHovered}>检查 / Inspect</div>
      </div>
    </div>

    <div data-inspector-tools className={styles.devtools} data-open={frame.panel} style={{ opacity: panelProgress, transform: `translateY(${(1 - panelProgress) * 18}px)` }}>
      <div className={styles.tabs}>
        <span data-inspector-picker data-inspector-target="picker" data-active={frame.pickerActive} className={styles.picker}><SelectionIcon size={19} /><CursorIcon size={12} weight="fill" className={styles.pickerPointer} /></span>
        <span className={styles.activeTab}>Elements</span><span>Console</span><span>Sources</span><span className={styles.panelHint}>开发者工具</span>
      </div>
      <div className={styles.panes}>
        <div className={styles.dom}>
          <div className={styles.treeLine}><CaretRightIcon size={10} /><span>&lt;body&gt;</span></div>
          <div data-inspector-node className={styles.codeBlock} data-active={frame.elementSelected}>
            <div><span className={styles.tag}>&lt;p</span> <span className={styles.attribute}>id</span>=<span className={styles.value}>&quot;title&quot;</span><span className={styles.tag}>&gt;</span></div>
            <div className={styles.textNode}><span data-inspector-target="text" data-selected={frame.selectedText} className={styles.editable}>{frame.codeText || '\u200b'}{frame.textTyping && <span className={styles.caret} />}</span></div>
            <div className={styles.tag}>&lt;/p&gt;</div>
          </div>
          <div className={styles.treeLine}><CaretRightIcon size={10} /><span>&lt;div&gt;…&lt;/div&gt;</span></div>
          <div className={styles.treeLine}>&lt;/body&gt;</div>
        </div>
      </div>
      <div className={styles.breadcrumb}>html <CaretRightIcon size={10} /> body <CaretRightIcon size={10} /> <span>p#title</span><span data-inspector-enter className={styles.enter} data-visible={frame.enter}>↵ Enter</span></div>
    </div>

    <span data-inspector-target="origin" className={styles.origin} />
    <div ref={cursor} className={styles.cursor} data-playing={playing}>
      <span className={styles.clickRing} data-visible={frame.click} />
      {(frame.selectedText || frame.textTyping) ? <CursorTextIcon size={24} weight="bold" /> : <CursorIcon size={25} weight="fill" />}
      {storyTime >= 900 && storyTime < 1700 && <span className={styles.pointerLabel}>右键</span>}
    </div>
  </div>;
}
