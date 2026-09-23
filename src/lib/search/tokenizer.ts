/**
 * [INPUT]: Searchable text in the five supported writing systems.
 * [OUTPUT]: Deterministic CJK character/bigram and accent-folded word tokens.
 * [POS]: Shared Fumadocs search-engine adapter; avoids browser ICU segmentation drift.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { create, type Tokenizer } from 'zbsearch';
export function tokenize(text: string): string[] {
  const tokens = new Set<string>();
  const segments = text.normalize('NFC').toLowerCase().match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+|[\p{L}\p{N}]+/gu) ?? [];
  for (const segment of segments) {
    if (/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(segment)) {
      const characters = [...segment];
      characters.forEach((character, index) => {
        tokens.add(character);
        if (characters[index + 1]) tokens.add(character + characters[index + 1]);
      });
    } else tokens.add(segment.normalize('NFD').replace(/\p{M}/gu, ''));
  }
  return [...tokens];
}
export function createSearchTokenizer(): Tokenizer {
  return { language: 'multilingual', normalizationCache: new Map(), tokenize };
}
export function createSearchDatabase() {
  return create({ schema: { _: 'string' }, components: { tokenizer: createSearchTokenizer() } });
}
