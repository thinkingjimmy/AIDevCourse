export const question = '今天广州的天气如何？';
export const answerParts = ['今天', '广州', '天气', '晴朗，', '温度在', ' 28 ℃。'];
export const answer = Array.from(answerParts.join(''));
const durations = answer.map((_, index) => index < 2 ? 3.2 : 1.6);
export const totalDuration = durations.reduce((sum, value) => sum + value, 0);
export const wordClass = 'whitespace-pre';
export const pendingClass = `${wordClass} inline-flex items-center align-baseline leading-none`;
export const placeholderClass = 'ml-1.5 inline-flex size-6 shrink-0 basis-6 -translate-y-[0.5px] items-center justify-center rounded-sm border border-border bg-background text-base leading-none font-normal text-muted-foreground before:content-["?"]';
export const symbol = (character: string) => character === ' ' ? '空格' : character;

type Candidate = { letter: string; probability: number };
function distribution(index: number): Candidate[] {
  if (index === 0) return [{ letter: '广', probability: 48 }, { letter: '今', probability: 42 }, { letter: '明', probability: 10 }];
  if (index === 1) return [{ letter: '天', probability: 81 }, { letter: '日', probability: 12 }, { letter: '晚', probability: 7 }];
  const alternatives = ['今', '天', '广', '的', '晴', '是'].filter((letter) => letter !== answer[index]);
  const probability = index % 4 === 0 ? 28 : 68 + index % 5 * 3;
  const second = Math.floor((100 - probability) * .65);
  const values = [{ letter: alternatives[0], probability: second }, { letter: alternatives[1], probability: 100 - probability - second }];
  values.splice(index % 3, 0, { letter: answer[index], probability });
  return values;
}

export function generationFrame(elapsed: number) {
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

export type GenerationFrame = ReturnType<typeof generationFrame>;
