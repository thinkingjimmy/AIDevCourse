// Preserve spaces without joining adjacent spans into one unbreakable line.
export const wordClass = 'whitespace-pre-wrap';
export const pendingClass = `${wordClass} inline-flex items-center align-baseline leading-none`;
export const placeholderClass = 'ml-1.5 inline-flex size-6 shrink-0 basis-6 -translate-y-[0.5px] items-center justify-center rounded-sm border border-border bg-background text-base leading-none font-normal text-muted-foreground before:content-["?"]';

type Candidate = { letter: string; probability: number };
type GenerationExample = {
  question: string;
  answer: string;
  firstAlternatives: string;
  secondAlternatives: string;
  alternatives: string;
};

export function createGenerationModel(example: GenerationExample, locale: string) {
  const answer = Array.from(example.answer);
  const answerParts = locale === 'zh'
    ? ['今天', '广州', '天气', '晴朗，', '温度在', ' 28 ℃。']
    : [...new Intl.Segmenter(locale, { granularity: 'word' }).segment(example.answer)].map(({ segment }) => segment);
  const durations = answer.map((_, index) => index < 2 ? 3.2 : 1.6);
  const totalDuration = durations.reduce((sum, value) => sum + value, 0);

  function distribution(index: number): Candidate[] {
    if (index === 0) return [{ letter: example.firstAlternatives[0], probability: 48 }, { letter: answer[0], probability: 42 }, { letter: example.firstAlternatives[1], probability: 10 }];
    if (index === 1) return [{ letter: answer[1], probability: 81 }, { letter: example.secondAlternatives[0], probability: 12 }, { letter: example.secondAlternatives[1], probability: 7 }];
    const alternatives = [...new Set(Array.from(example.alternatives))].filter((letter) => letter !== answer[index]);
    const probability = index % 4 === 0 ? 28 : 68 + index % 5 * 3;
    const second = Math.floor((100 - probability) * .65);
    const values = [{ letter: alternatives[0], probability: second }, { letter: alternatives[1], probability: 100 - probability - second }];
    values.splice(index % 3, 0, { letter: answer[index], probability });
    return values;
  }

  function generationFrame(elapsed: number) {
    const complete = elapsed >= totalDuration;
    let index = 0;
    let remaining = Math.max(0, elapsed);
    while (index < answer.length - 1 && remaining >= durations[index]) {
      remaining -= durations[index];
      index++;
    }
    const progress = complete ? 1 : Math.min(1, remaining / durations[index]);
    const candidates = distribution(index);
    // Replay a preset sampling outcome so the teaching example stays repeatable.
    const chosen = candidates.find((candidate) => candidate.letter === answer[index])!;
    const dropped = progress >= .73;
    const feeding = !complete && index < answer.length - 1 && progress >= .86;
    const phase = complete ? 'complete' : feeding ? 'linefeed' : dropped ? 'updated' : progress >= .64 ? 'dropping' : progress >= .48 ? 'selected' : progress >= .22 ? 'probabilities' : 'calculating';
    return {
      index, progress, candidates, chosen, complete, dropped, feeding, phase,
      ready: progress >= .22, selected: progress >= .48, copied: progress >= .56,
      prefix: answer.slice(0, index).join(''),
      nextPrefix: answer.slice(0, index + (dropped ? 1 : 0)).join(''),
    };
  }

  return { question: example.question, answer, answerParts, totalDuration, generationFrame };
}

export type GenerationModel = ReturnType<typeof createGenerationModel>;
export type GenerationFrame = ReturnType<GenerationModel['generationFrame']>;
