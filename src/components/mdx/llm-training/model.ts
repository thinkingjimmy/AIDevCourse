export const trainingCandidates = ['伞', '雨衣', '帽子'] as const;
export const trainingTarget = '伞';
export const trainingTargetIndex = trainingCandidates.indexOf(trainingTarget);
export const trainingInput = '今天雨天，出门记得带';
export const trainingSteps = ['初始化', '预测', '对照', '调参数'] as const;
export const trainingFormulaInput = 1;

export type TrainingFormulaCandidate = {
  token: typeof trainingCandidates[number];
  a: number;
  b: number;
  score: number;
  probability: number;
};

// Each candidate has its own coefficients; the umbrella values follow the article's initialization and update.
const formulaParameters = [
  [[0.5, 1.1], [1, 1.08], [0.8, 1.15]],
  [[0.6, 1.2], [0.4, 1], [0.3, 0.91]],
] as const;

export const trainingFormulaModels: readonly (readonly TrainingFormulaCandidate[])[] = formulaParameters.map((parameters) => {
  const scores = parameters.map(([a, b]) => Number((a * trainingFormulaInput + b).toFixed(2)));
  const largest = Math.max(...scores);
  const exponentials = scores.map((score) => Math.exp(score - largest));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return parameters.map(([a, b], index) => ({
    token: trainingCandidates[index], a, b, score: scores[index], probability: Math.round(exponentials[index] / total * 100),
  }));
});

export const trainingProbabilities: readonly (readonly number[])[] = [
  ...trainingFormulaModels.map((model) => model.map((candidate) => candidate.probability)),
  [60, 22, 18],
  [72, 16, 12],
];

export function probabilitySummary(probabilities: readonly number[]) {
  return trainingCandidates.map((candidate, index) => `${candidate} ${probabilities[index]}%`).join('，');
}
