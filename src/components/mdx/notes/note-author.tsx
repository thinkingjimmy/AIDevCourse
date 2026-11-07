'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { AuthorDialog } from '@/components/author/author-card';
import { Button } from '@/components/ui/button';
import { author } from '@/lib/site-config';

const entryClass = 'size-11 shrink-0 rounded-sm text-lg before:inset-0 hover:bg-brand-soft focus-visible:outline-brand';

export function NoteAuthor() {
  const t = useTranslations('Author');

  // Notes already have a noscript wrapper, so the author fallback uses CSS.
  return <header data-slot="note-signature" className="sticky top-0 z-10 mb-3 flex items-center justify-between gap-2 border-b border-brand/15 bg-background pb-3 [[data-slot=jimmy-note-popover]_&]:static [[data-slot=jimmy-note-popover]_&]:pr-9">
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Image src={author.avatar} alt="" width={32} height={32} sizes="2rem" className="size-8 shrink-0 rounded-sm object-cover ring-1 ring-brand/20" />
      <div className="min-w-0">
        <span className="block text-sm leading-copy font-medium text-brand" lang="en">{author.name}</span>
        <span className="block text-xs leading-copy text-brand/80">{t('articleRole')}</span>
      </div>
    </div>
    <div data-slot="note-author-actions" className="flex shrink-0 items-center">
      <AuthorDialog>
        <Button variant="ghost" size="icon-touch" aria-label={t('label')} title={t('label')} className={`${entryClass} [@media(scripting:none)]:hidden`}>
          <span aria-hidden>👋</span>
        </Button>
      </AuthorDialog>
      <Button asChild variant="ghost" size="icon-touch" className={`${entryClass} [@media(scripting:enabled)]:hidden`}>
        <a href={author.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={t('website')} title={t('website')}><span aria-hidden>👋</span></a>
      </Button>
    </div>
  </header>;
}
