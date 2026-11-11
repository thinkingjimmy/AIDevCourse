import type { Locale } from './config';

export async function loadMessages(locale: Locale) {
  const [base, vocabulary, animationVocabulary, programmingVocabulary] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/vocabulary/${locale}.json`),
    import(`../../messages/animation-vocabulary/${locale}.json`),
    import(`../../messages/programming-vocabulary/${locale}.json`),
  ]);
  return { ...base.default, Vocabulary: vocabulary.default, AnimationVocabulary: animationVocabulary.default, ProgrammingVocabulary: programmingVocabulary.default };
}
