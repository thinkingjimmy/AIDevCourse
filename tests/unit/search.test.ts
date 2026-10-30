import { expect, it } from 'vitest';
import { tokenize, createSearchTokenizer } from '../../src/lib/search';
import { createSearchAPI } from 'fumadocs-core/search/server';
it('uses identical tokens for accented words and deterministic CJK substrings', () => {
  expect(tokenize('vérifier código')).toEqual(tokenize('verifier codigo'));
  expect(tokenize('提供上下文')).toEqual(expect.arrayContaining(tokenize('上下文')));
  expect(tokenize('コードの確認を行います')).toEqual(expect.arrayContaining(tokenize('コードの確認')));
});
it('finds CJK and accentless queries through the actual Fumadocs engine', async () => {
  const server = createSearchAPI('simple', { tokenizer: createSearchTokenizer(), indexes: [
    { title: '检查代码', content: '提供上下文，写清提示词。', url: '/zh/courses/course/lesson' },
    { title: 'コードの確認', content: 'コンテキストとプロンプト', url: '/ja/courses/course/lesson' },
    { title: 'Vérifier', content: 'contexte', url: '/fr/courses/course/lesson' },
    { title: 'Código', content: 'contexto', url: '/es/courses/course/lesson' },
  ] });
  for (const [query, locale] of [['上下文', 'zh'], ['プロンプト', 'ja'], ['verifier', 'fr'], ['codigo', 'es']]) {
    expect((await server.search(query)).some((result) => result.url.startsWith(`/${locale}/`))).toBe(true);
  }
});
