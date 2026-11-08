'use client';

import { useId, useLayoutEffect, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { PencilSimpleLineIcon } from '@phosphor-icons/react/dist/ssr/PencilSimpleLine';
import { Button } from '@/components/ui/button';
import { createIssueLinks } from './issue-links';
import type { LessonSelection } from './selection';

type Props = {
  title: string;
  pageUrl: string;
  selection: LessonSelection;
  menuRef: RefObject<HTMLDivElement | null>;
};

export function SelectionMenu({ title, pageUrl, selection, menuRef }: Props) {
  const t = useTranslations('Course');
  const hintId = useId();
  const noticeId = useId();
  const { links, truncated } = createIssueLinks({ title, pageUrl, text: selection.text, excerptNotice: t('selectionExcerpt') });

  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!element) return;
    const { bounds, rect } = selection;
    const position = () => {
      element.style.maxWidth = `${bounds.right - bounds.left - 24}px`;
      element.style.maxHeight = `${bounds.bottom - bounds.top - 24}px`;
      const { width, height } = element.getBoundingClientRect();
      const above = rect.top - height - 8;
      const side = above >= bounds.top + 12 ? 'top' : 'bottom';
      const top = side === 'top' ? above : rect.bottom + 8;
      element.style.left = `${Math.max(bounds.left + 12, Math.min((rect.left + rect.right - width) / 2, bounds.right - width - 12))}px`;
      element.style.top = `${Math.max(bounds.top + 12, Math.min(top, bounds.bottom - height - 12))}px`;
      element.dataset.side = side;
      element.style.visibility = 'visible';
    };
    position();
    const resize = new ResizeObserver(position);
    resize.observe(element);
    return () => resize.disconnect();
  }, [selection, menuRef, truncated]);

  return createPortal(<div ref={menuRef} role="group" aria-label={t('selectionActions')} data-slot="selection-feedback"
    style={{ left: 0, top: 0, visibility: 'hidden' }}
    className="fixed z-[75] w-max overflow-y-auto rounded-md border border-border bg-background p-0.5 font-sans text-foreground shadow-md"
    onMouseDown={event => { if (event.button === 0) event.preventDefault(); }}>
    <div className="flex">
      {links.map(link => <Button asChild variant="ghost" size="sm" key={link.kind}
        className="gap-1 rounded-sm px-2 text-xs has-[>svg]:px-2 focus-visible:-outline-offset-2">
        <a href={link.href} target="_blank" rel="noopener noreferrer" aria-describedby={`${hintId}${truncated ? ` ${noticeId}` : ''}`}>
          {link.kind === 'question' ? <ChatCircleIcon size={14} aria-hidden /> : <PencilSimpleLineIcon size={14} aria-hidden />}
          {t(link.kind === 'question' ? 'selectionQuestion' : 'selectionCorrection')}
        </a>
      </Button>)}
    </div>
    <span id={hintId} className="sr-only">{t('selectionDestination')}</span>
    {truncated && <p id={noticeId} className="m-0 max-w-56 px-3 pb-2 text-xs leading-copy text-muted-foreground">{t('selectionExcerpt')}</p>}
  </div>, document.body);
}
