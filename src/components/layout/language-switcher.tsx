/**
 * [INPUT]: Public translation map, current URL, Phosphor icons, shared Button, and the site border token.
 * [OUTPUT]: Globe trigger and one content-sized native language menu, with top/bottom placement, valid hashes, explained fallback links, and preference saving.
 * [POS]: Progressive-enhancement language control shared by desktop and mobile.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GlobeIcon } from '@phosphor-icons/react/dist/ssr/Globe';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { locales, languageNames, htmlLanguages, localeCookie, type Locale } from '@/lib/i18n/config';
import type { Catalog } from '@/lib/content/types';
const languageFlags: Record<Locale, string> = { en: '🇺🇸', zh: '🇨🇳', ja: '🇯🇵', fr: '🇫🇷', es: '🇪🇸' };
export function LanguageSwitcher({ locale, translations, side = 'bottom' }: { locale: Locale; translations: Catalog['translations']; side?: 'top' | 'bottom' }) {
  const t = useTranslations('Language');
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);
  const current = Object.entries(translations).find(([, versions]) => versions.some((version) => version.url === pathname));
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node) && ref.current) ref.current.open = false; };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return <details className="language-picker relative" ref={ref} onKeyDown={(event) => {
    if (event.key === 'Tab') {
      const menu = event.currentTarget;
      requestAnimationFrame(() => { if (!menu.contains(document.activeElement)) menu.open = false; });
    }
    if (event.key === 'Escape' && ref.current?.open) {
      event.preventDefault(); event.stopPropagation();
      ref.current.open = false; ref.current.querySelector('summary')?.focus();
    }
  }}>
    <Button asChild variant="ghost" size="icon-touch" className="list-none text-muted-foreground [&::-webkit-details-marker]:hidden">
      <summary aria-label={t('label')} title={t('label')}><GlobeIcon size={20} aria-hidden /></summary>
    </Button>
    <nav className={cn('language-options absolute z-[60] max-h-[75dvh] w-max max-w-[calc(100vw-32px)] overflow-auto border border-border bg-background p-1.5 text-[15px] leading-[1.65] font-normal text-muted-foreground shadow-[4px_4px_0_var(--line)]', side === 'top' ? 'bottom-[calc(100%+10px)] left-0' : 'top-[calc(100%+10px)] right-0')} aria-label={t('label')}>
      {locales.map((lang) => {
        const samePage = current?.[1].find((version) => version.locale === lang);
        const coursePage = current && translations[current[0].split(':')[0]]?.find((version) => version.locale === lang);
        const simple = /^\/(en|zh|ja|fr|es)(\/about)?$/.test(pathname);
        const url = samePage?.url ?? (simple ? pathname.replace(/^\/[^/]+/, `/${lang}`) : coursePage?.url ?? `/${lang}/courses/ai-101`);
        const fallback = current && !samePage ? t(coursePage ? 'courseFallback' : 'listFallback') : undefined;
        return <a className="flex min-h-11 touch-manipulation items-center justify-between gap-5 border-b border-line-soft px-3 py-2.5 text-[15px] font-[550] whitespace-nowrap no-underline last:border-0 hover:bg-surface aria-current:bg-surface" key={lang} href={url} hrefLang={htmlLanguages[lang]} aria-current={lang === locale ? 'true' : undefined} onClick={(event) => {
          try { document.cookie = `${localeCookie}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`; } catch { /* Explicit URLs remain usable without cookies. */ }
          const hash = window.location.hash;
          if (hash) {
            try { if (samePage?.headings.includes(decodeURIComponent(hash.slice(1)))) event.currentTarget.href = `${url}${hash}`; }
            catch { /* An invalid hash is safely discarded. */ }
          }
        }}><span><span lang={htmlLanguages[lang]}><span aria-hidden="true">{languageFlags[lang]} </span>{languageNames[lang]}</span>{fallback && <small className="mt-1 block max-w-40 text-[12px] leading-relaxed font-normal whitespace-normal">{fallback}</small>}</span><span className="size-4 shrink-0" aria-hidden>{lang === locale && <CheckIcon size={16} />}</span></a>;
      })}
    </nav>
  </details>;
}
