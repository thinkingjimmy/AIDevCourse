'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link, { type LinkProps } from 'fumadocs-core/link';
import { HoverCard } from 'radix-ui';
import { useTranslations } from 'next-intl';
import { GlobeIcon } from '@phosphor-icons/react/dist/ssr/Globe';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';
import type { LinkPreviewData } from '@/lib/link-preview/model';

const previews = new Map<string, { expires: number; promise: Promise<LinkPreviewData | null> }>();
function loadPreview(href: string) {
  const cached = previews.get(href);
  if (cached && cached.expires > Date.now()) return cached.promise;
  if (previews.size >= 100) previews.delete(previews.keys().next().value!);
  const entry = { expires: Date.now() + 300000, promise: fetch(`/api/link-preview?${new URLSearchParams({ href })}`, { signal: AbortSignal.timeout(6000) })
    .then(async (response): Promise<LinkPreviewData | null> => {
      if (!response.ok || response.status === 204) throw new Error('Preview unavailable');
      return response.json();
    }).catch(() => { entry.expires = Date.now() + 30000; return null; }) };
  previews.set(href, entry);
  return entry.promise;
}

export function LinkPreview(props: LinkProps) {
  const href = props.href ?? '';
  const isPage = /^https?:\/\//i.test(href) || href.startsWith('/') && !href.startsWith('//');
  if (!isPage || props.download !== undefined) return <Link {...props} />;
  try { new URL(href, 'https://aidevcourse.invalid'); } catch { return <Link {...props} />; }
  return <PreviewLink key={href} {...props} href={href} />;
}

function PreviewLink({ href, children, ref, ...props }: LinkProps & { href: string }) {
  const t = useTranslations('Ui');
  const id = useId();
  const touch = useRef(false);
  const dismissed = useRef(false);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<LinkPreviewData | null>();
  const [imageFailed, setImageFailed] = useState(false);
  const host = /^https?:\/\//i.test(href) ? new URL(href).hostname : 'AIDevCourse';

  useEffect(() => {
    if (!open) return;
    let active = true;
    loadPreview(href).then((data) => { if (active) setPreview(data); });
    return () => { active = false; };
  }, [open, href]);

  return <HoverCard.Root open={open} onOpenChange={(next) => { if (!next || !dismissed.current) setOpen(next); }} openDelay={350} closeDelay={180}>
    <HoverCard.Trigger asChild
      onPointerDown={(event) => { touch.current = event.pointerType === 'touch'; }}
      onPointerEnter={(event) => { if (event.pointerType !== 'touch') { touch.current = false; dismissed.current = false; } }}
      onKeyDown={() => { touch.current = false; }}
      onFocus={(event) => { if (touch.current) event.preventDefault(); else dismissed.current = false; }}>
      <Link {...props} ref={ref} href={href} aria-describedby={open ? [props['aria-describedby'], id].filter(Boolean).join(' ') : props['aria-describedby']} data-link-preview="">{children}</Link>
    </HoverCard.Trigger>
    <HoverCard.Portal>
      <HoverCard.Content id={id} role="tooltip" side="top" align="start" sideOffset={10} collisionPadding={12}
        onEscapeKeyDown={() => { dismissed.current = true; }}
        data-slot="link-preview" className="not-prose z-[70] max-h-[var(--radix-hover-card-content-available-height)] w-85 max-w-[calc(100vw-24px)] overflow-hidden rounded-sm border border-border bg-background font-sans text-foreground shadow-lg outline-none">
        <span className="sr-only">{t('linkPreview')}</span>
        {preview?.image && !imageFailed &&
          // Metadata images have arbitrary remote hosts; the browser loads them only while the card is visible.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.image} alt="" width={680} height={382} referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className="aspect-video h-auto max-h-[min(25vh,max(0px,calc(var(--radix-hover-card-content-available-height)-16rem)))] w-full border-b border-border bg-muted object-cover" />}
        <div className="p-4">
          {preview === undefined ? <div role="status" className="space-y-3 py-1">
            <span className="sr-only">{t('linkPreviewLoading')}</span>
            <div aria-hidden className="h-4 w-4/5 rounded-sm bg-muted motion-safe:animate-pulse" />
            <div aria-hidden className="h-3 w-full rounded-sm bg-muted motion-safe:animate-pulse" />
            <div aria-hidden className="h-3 w-2/3 rounded-sm bg-muted motion-safe:animate-pulse" />
          </div> : <>
            <p className="m-0 line-clamp-2 text-base leading-snug font-semibold [overflow-wrap:anywhere]">{preview?.title || host}</p>
            {(preview?.description || preview === null) && <p className="m-0 mt-2 line-clamp-3 text-sm leading-body text-muted-foreground [overflow-wrap:anywhere]">{preview?.description || t('linkPreviewUnavailable')}</p>}
          </>}
          <div className="mt-4 flex items-center gap-2 text-caption text-muted-foreground">
            <GlobeIcon size={14} className="shrink-0" aria-hidden /><span className="min-w-0 truncate">{host}</span><ArrowUpRightIcon size={14} className="ml-auto shrink-0" aria-hidden />
          </div>
        </div>
      </HoverCard.Content>
    </HoverCard.Portal>
  </HoverCard.Root>;
}
