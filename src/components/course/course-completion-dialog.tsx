'use client';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { GraduationCapIcon } from '@phosphor-icons/react/dist/ssr/GraduationCap';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { AuthorSupportActions } from '@/components/author/author-actions';
import { playAchievementConfetti } from '@/components/progress/confetti';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/overlays/dialog';

export function CourseCompletionDialog({ open, courseTitle, completed, saveFailed, onClose }: {
  open: boolean; courseTitle: string; completed: boolean; saveFailed: boolean; onClose: () => void;
}) {
  const t = useTranslations('Course');
  const ui = useTranslations('Ui');
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (open) return playAchievementConfetti({ layer: 'dialog' });
  }, [open]);

  return <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
    <DialogContent data-course-completion-dialog overlayClassName="bg-background/60 backdrop-blur-sm"
      className="top-1/2 max-h-[calc(100dvh-32px)] w-[min(480px,calc(100vw-32px))] -translate-y-1/2 rounded-sm border-brand shadow-[4px_4px_0_var(--color-brand-soft)] max-sm:top-1/2"
      onOpenAutoFocus={(event) => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
      onCloseAutoFocus={(event) => { event.preventDefault(); }}>
      <header className="flex shrink-0 items-start justify-between gap-3 px-6 pt-5 max-sm:px-4">
        <span aria-hidden className="flex size-14 items-center justify-center rounded-sm border border-brand bg-brand-soft text-brand shadow-[3px_3px_0_var(--color-brand-soft)]">
          <GraduationCapIcon size={32} />
        </span>
        <DialogClose asChild><Button variant="brand-outline" size="icon-touch" className="size-11 shrink-0 rounded-sm before:inset-0" aria-label={ui('close')}><XIcon size={18} aria-hidden /></Button></DialogClose>
      </header>
      <div className="min-h-0 overflow-y-auto px-6 pt-5 pb-6 max-sm:px-4">
        <DialogTitle ref={heading} tabIndex={-1} className="m-0 text-xl leading-snug font-semibold tracking-tight wrap-anywhere text-brand focus-visible:outline-brand">
          {completed ? t('completionTitle', { course: courseTitle }) : t('completionPartialTitle')}
        </DialogTitle>
        <DialogDescription className="mt-3 mb-0 text-sm leading-reading text-reading">
          {t(completed ? 'completionBody' : 'completionPartialBody')}
        </DialogDescription>
        <div className="mt-5 border-t border-brand/15 pt-5">
          <p className="m-0 text-sm leading-copy text-reading">{t('completionInvitation')}</p>
          <AuthorSupportActions stacked className="mt-4" />
        </div>
        {saveFailed && <p role="status" className="mt-4 mb-0 text-sm leading-copy text-muted-foreground">{t('completionSaveFailed')}</p>}
        <footer className="mt-5 border-t border-brand/15 pt-4">
          <DialogClose asChild><Button variant="brand-outline" className="h-auto min-h-11 w-full rounded-sm px-4 py-2 text-sm leading-snug whitespace-normal">{t('completionOverview')}</Button></DialogClose>
        </footer>
      </div>
    </DialogContent>
  </Dialog>;
}
