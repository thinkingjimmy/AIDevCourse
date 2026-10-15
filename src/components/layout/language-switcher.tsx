/**
 * [INPUT]: Public identity-to-translation map and the current URL.
 * [OUTPUT]: Native language links with explicit fallback, valid hashes, and preference saving. Compact mode shows 中 / EN.
 * [POS]: Progressive-enhancement language control shared by desktop and mobile.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { locales, languageNames, htmlLanguages, localeCookie, type Locale } from '@/lib/i18n/config';
import type { Catalog } from '@/lib/content/types';
const pairMark: Partial<Record<Locale, string>> = { ja: '日', fr: 'FR', es: 'ES' };
export function LanguageSwitcher({ locale, translations, compact = false }: { locale: Locale; translations: Catalog['translations']; compact?: boolean }) {
  const t = useTranslations('Language');
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);
  const current = Object.entries(translations).find(([, versions]) => versions.some((version) => version.url === pathname));
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node) && ref.current) ref.current.open = false; };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const extra = pairMark[locale];
  return <details className={compact ? 'language-picker lang-compact' : 'language-picker'} ref={ref} onKeyDown={(event) => {
    if (event.key === 'Escape' && ref.current) { ref.current.open = false; ref.current.querySelector('summary')?.focus(); }
  }} onBlur={(event) => {
    // WebKit may blur a summary to no focus target before dispatching a link click.
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node) && ref.current) ref.current.open = false;
  }}>
    <summary aria-label={t('label')}>{compact
      ? <span className="lang-pair" lang={htmlLanguages[locale]}>中<span aria-hidden> / </span>EN{extra ? <><span aria-hidden> · </span><span data-current="">{extra}</span></> : null}</span>
      : <><Globe size={16} aria-hidden /><span lang={htmlLanguages[locale]}>{languageNames[locale]}</span><ChevronDown size={13} aria-hidden /></>}</summary>
    <nav className="language-options" aria-label={t('label')}>
      {locales.map((lang) => {
        const samePage = current?.[1].find((version) => version.locale === lang);
        const coursePage = current && translations[current[0].split(':')[0]]?.find((version) => version.locale === lang);
        const simple = /^\/(en|zh|ja|fr|es)(\/about)?$/.test(pathname);
        const url = samePage?.url ?? (simple ? pathname.replace(/^\/[^/]+/, `/${lang}`) : coursePage?.url ?? `/${lang}/courses/ai-101`);
        const reason = samePage || simple ? 'available' : coursePage ? 'courseFallback' : 'listFallback';
        return <a key={lang} href={url} hrefLang={htmlLanguages[lang]} aria-current={lang === locale ? 'true' : undefined} onClick={(event) => {
          try { document.cookie = `${localeCookie}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`; } catch { /* Explicit URLs remain usable without cookies. */ }
          const hash = window.location.hash;
          if (hash) {
            try { if (samePage?.headings.includes(decodeURIComponent(hash.slice(1)))) event.currentTarget.href = `${url}${hash}`; }
            catch { /* An invalid hash is safely discarded. */ }
          }
        }}><span className="language-name" lang={htmlLanguages[lang]}>{languageNames[lang]}{lang === locale && <Check size={15} aria-hidden />}</span><small>{t(reason)}</small></a>;
      })}
    </nav>
  </details>;
}
