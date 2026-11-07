import type { Locale } from '@/lib/i18n/config';

export const tokenizationText = '今天广州的天气如何？';

export const tokenizationTokens = [
  { text: '今天', id: 47256 },
  { text: '广州', id: 132426 },
  { text: '的', id: 1616 },
  { text: '天气', id: 167823 },
  { text: '如何', id: 24608 },
  { text: '？', id: 4802 },
] as const;

export type Token = { text: string; id: number };
type TokenizationExample = { text: string; tokens: readonly Token[]; output: Token };

// Verified with tiktoken 0.14.0, o200k_base; spaces are part of the encoded text.
const translatedExamples: Record<Exclude<Locale, 'zh'>, TokenizationExample> = {
  en: {
    text: "How is the weather in Guangzhou today?",
    tokens: [
      { text: "How", id: 5299 },
      { text: " is", id: 382 },
      { text: " the", id: 290 },
      { text: " weather", id: 11122 },
      { text: " in", id: 306 },
      { text: " Guangzhou", id: 150150 },
      { text: " today", id: 4044 },
      { text: "?", id: 30 },
    ],
    output: { text: "Today", id: 18449 },
  },
  ja: {
    text: "今日の広州の天気はどうですか？",
    tokens: [
      { text: "今日", id: 45396 },
      { text: "の", id: 3385 },
      { text: "広", id: 68112 },
      { text: "州", id: 13465 },
      { text: "の", id: 3385 },
      { text: "天", id: 867 },
      { text: "気", id: 25717 },
      { text: "は", id: 5205 },
      { text: "どう", id: 85545 },
      { text: "です", id: 15121 },
      { text: "か", id: 7128 },
      { text: "？", id: 4802 },
    ],
    output: { text: "今日", id: 45396 },
  },
  fr: {
    text: "Quel temps fait-il à Guangzhou aujourd’hui ?",
    tokens: [
      { text: "Quel", id: 77754 },
      { text: " temps", id: 11160 },
      { text: " fait", id: 7473 },
      { text: "-il", id: 25313 },
      { text: " à", id: 1221 },
      { text: " Guangzhou", id: 150150 },
      { text: " aujourd", id: 32226 },
      { text: "’hui", id: 36890 },
      { text: " ?", id: 1423 },
    ],
    output: { text: "Aujourd", id: 127519 },
  },
  es: {
    text: "¿Qué tiempo hace hoy en Guangzhou?",
    tokens: [
      { text: "¿Qué", id: 68156 },
      { text: " tiempo", id: 12841 },
      { text: " hace", id: 15105 },
      { text: " hoy", id: 20502 },
      { text: " en", id: 469 },
      { text: " Guangzhou", id: 150150 },
      { text: "?", id: 30 },
    ],
    output: { text: "Hoy", id: 77659 },
  },
};

export function getTokenizationExample(locale: Locale): TokenizationExample {
  return locale === 'zh'
    ? { text: tokenizationText, tokens: tokenizationTokens, output: tokenizationTokens[0] }
    : translatedExamples[locale];
}
