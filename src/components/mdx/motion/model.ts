export const typewriterText = '让你的想法，动起来。';
export const countTarget = 1280;

export const animationExamples = {
  stagger: { name: 'Stagger', timing: '每项 0.3 秒 · 间隔 0.08 秒', duration: 460, hint: '三项任务，依次进场。' },
  spring: { name: 'Spring', timing: '0.45 秒', duration: 450, hint: '缩小、回弹，然后停住。' },
  skeleton: { name: 'Skeleton', timing: '每轮 1.4 秒', duration: null, hint: '灰块占位，一道光从左扫到右。' },
  'count-up': { name: 'Count Up', timing: '1.2 秒', duration: 1200, hint: '从 0 增长到 1,280。' },
  typewriter: { name: 'Typewriter', timing: '每字 0.08 秒', duration: Array.from(typewriterText).length * 80, hint: '逐字出现，打完就停。' },
  marquee: { name: 'Marquee', timing: '每轮 12 秒', duration: null, hint: '虚构品牌，匀速循环。' },
} as const;

export type AnimationType = keyof typeof animationExamples;

export function frameText(type: AnimationType, elapsed: number) {
  if (type === 'typewriter') return Array.from(typewriterText).slice(0, Math.floor(elapsed / 80)).join('');
  const progress = Math.min(1, elapsed / animationExamples['count-up'].duration);
  return Math.round(countTarget * (1 - (1 - progress) ** 3)).toLocaleString('en-US');
}
