'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { locales, languageNames, htmlLanguages, localeCookie, defaultLocale, type Locale } from '@/lib/i18n/config';
import { canonicalPath, localePath, stripLocale } from '@/lib/i18n/routing';
import type { Catalog } from '@/lib/content/model';
type LanguageProps = { locale: Locale; translations: Catalog['translations'] };
const languageFlags: Record<Locale, string> = { en: '🇺🇸', zh: '🇨🇳', ja: '🇯🇵', fr: '🇫🇷', es: '🇪🇸' };
export function HomeLanguageSwitcher(props: LanguageProps) {
  const path = canonicalPath(usePathname());
  return stripLocale(path) === '/' ? <LanguageSwitcher {...props} side="top" /> : null;
}
export function LanguageSwitcher({ locale, translations, side = 'bottom' }: LanguageProps & { side?: 'top' | 'bottom' }) {
  const t = useTranslations('Language');
  const ref = useRef<HTMLDetailsElement>(null);
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
    <Button asChild variant="ghost" size="icon-touch" className="list-none text-lg [&::-webkit-details-marker]:hidden">
      <summary aria-label={t('label')} title={t('label')}><span aria-hidden>🌐</span></summary>
    </Button>
    <nav className={cn('language-options absolute right-0 z-[60] max-h-[75dvh] w-max max-w-[calc(100vw-32px)] overflow-auto border border-border bg-background p-1.5 text-ui leading-copy font-normal text-muted-foreground shadow-[4px_4px_0_var(--line)]', side === 'top' ? 'bottom-[calc(100%+10px)]' : 'top-[calc(100%+10px)]')} aria-label={t('label')}>
      <LanguageLinks locale={locale} translations={translations} />
    </nav>
  </details>;
}

function LanguageLinks({ locale, translations }: LanguageProps) {
  const t = useTranslations('Language');
  const pathname = canonicalPath(usePathname());
  const current = Object.entries(translations).find(([, versions]) => versions.some((version) => version.url === pathname));
  return <>
      {locales.map((lang) => {
        const samePage = current?.[1].find((version) => version.locale === lang);
        const coursePage = current && translations[current[0].split(':')[0]]?.find((version) => version.locale === lang);
        const page = stripLocale(pathname);
        const simple = page === '/' || page === '/about';
        const url = samePage?.url ?? (simple ? localePath(lang, page) : coursePage?.url ?? localePath(lang));
        const fallback = current && !samePage ? t(coursePage ? 'courseFallback' : 'listFallback') : undefined;
        // The root otherwise negotiates again, so native English-home links carry the explicit choice.
        const href = lang === defaultLocale && url === '/' ? '/?lang=en' : url;
        return <a className="flex min-h-11 touch-manipulation items-center justify-between gap-5 border-b border-line-soft px-3 py-2.5 text-ui font-[550] whitespace-nowrap no-underline last:border-0 hover:bg-surface aria-current:bg-surface" key={lang} href={href} hrefLang={htmlLanguages[lang]} aria-current={lang === locale ? 'true' : undefined} onClick={(event) => {
          let saved = false;
          try {
            document.cookie = `${localeCookie}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
            saved = document.cookie.split(';').some((entry) => entry.trim() === `${localeCookie}=${lang}`);
          } catch { /* The explicit homepage choice also works without cookie access. */ }
          event.currentTarget.href = saved ? url : href;
          const hash = window.location.hash;
          if (hash) {
            try { if (samePage?.headings.includes(decodeURIComponent(hash.slice(1)))) event.currentTarget.href = `${url}${hash}`; }
            catch { /* An invalid hash is safely discarded. */ }
          }
        }}><span className="min-w-0"><span lang={htmlLanguages[lang]}><span aria-hidden="true">{languageFlags[lang]} </span>{languageNames[lang]}</span>{fallback && <small className="mt-1 block max-w-40 text-xs leading-relaxed font-normal whitespace-normal">{fallback}</small>}</span><span className="size-4 shrink-0" aria-hidden>{lang === locale && <CheckIcon size={16} />}</span></a>;
      })}
  </>;
}
