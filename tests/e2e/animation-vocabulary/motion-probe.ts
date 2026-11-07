import type { Locator } from '@playwright/test';

export async function sample(card: Locator) {
  return card.evaluate(card => {
    const element = card.querySelector('.entrance-target');
    const style = element && getComputedStyle(element);
    const matrix = new DOMMatrixReadOnly(style?.transform);
    return { opacity: Number(style?.opacity ?? 0), x: matrix.m41, y: matrix.m42, scale: matrix.a,
      clip: style?.clipPath, present: Boolean(card.querySelector('[data-animation-sample]')),
      phase: card.querySelector('.entrance-demo')?.getAttribute('data-phase') };
  });
}

export async function record(button: Locator, reverse = false) {
  await button.scrollIntoViewIfNeeded();
  return button.evaluate((button: HTMLButtonElement, reverse) => new Promise<{
    elapsed: number; frames: { time: number; opacity: number; x: number; y: number; scale: number; clip: string; present: boolean; phase: string | null }[];
    reversal?: { opacity: number; y: number };
  }>((resolve, reject) => {
    const card = button.closest('.vocabulary-term')!;
    const start = performance.now();
    const frames: { time: number; opacity: number; x: number; y: number; scale: number; clip: string; present: boolean; phase: string | null }[] = [];
    let reversal: { opacity: number; y: number } | undefined;
    button.click();
    function tick() {
      const element = card.querySelector('.entrance-target');
      const style = element && getComputedStyle(element);
      const matrix = new DOMMatrixReadOnly(style?.transform);
      const time = performance.now() - start;
      const phase = card.querySelector('.entrance-demo')!.getAttribute('data-phase');
      const frame = { time, opacity: Number(style?.opacity ?? 0), x: matrix.m41, y: matrix.m42, scale: matrix.a,
        clip: style?.clipPath ?? 'none', present: Boolean(card.querySelector('[data-animation-sample]')), phase };
      frames.push(frame);
      if (reverse && !reversal && frame.opacity < 0.8 && frame.opacity > 0.2) {
        reversal = { opacity: frame.opacity, y: frame.y };
        button.click();
      } else if (frames.length >= 3 && time > 50 && phase !== 'entering' && phase !== 'exiting') {
        resolve({ elapsed: time, frames, reversal });
        return;
      }
      if (time > 5000) { reject(new Error(`Playback did not settle: ${phase}`)); return; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }), reverse);
}
