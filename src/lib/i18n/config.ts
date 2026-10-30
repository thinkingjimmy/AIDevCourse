export const locales = ['en', 'zh', 'ja', 'fr', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const languageNames: Record<Locale, string> = {
  en: 'English', zh: '简体中文', ja: '日本語', fr: 'Français', es: 'Español',
};
export const htmlLanguages: Record<Locale, string> = {
  en: 'en', zh: 'zh-Hans', ja: 'ja', fr: 'fr', es: 'es',
};
export const localeCookie = 'lac-language';
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && locales.includes(value as Locale);
}
export function negotiateLocale(cookie?: string, acceptLanguage = ''): Locale {
  if (isLocale(cookie)) return cookie;
  const languages = acceptLanguage.split(',').map((part, index) => {
    const [tag, ...params] = part.trim().split(';');
    const quality = params.find((param) => param.trim().startsWith('q='));
    return { tag: tag.toLowerCase().split('-')[0], q: quality ? Number(quality.trim().slice(2)) : 1, index };
  }).filter(({ q }) => Number.isFinite(q) && q > 0 && q <= 1)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return languages.find(({ tag }) => isLocale(tag))?.tag as Locale ?? defaultLocale;
}
