/**
 * [INPUT]: Browser viewport, reduced-motion preference, and the native Web Animations API.
 * [OUTPUT]: playAchievementConfetti starts dense, staggered two-corner bursts and returns an idempotent cleanup function.
 * [POS]: Decorative achievement feedback; owns its temporary viewport layer and animation lifecycle.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */

const colors = ['#ffca28', '#ff5a36', '#ff2d95', '#b84dff', '#536dfe', '#00b8ff', '#00d8a0', '#ffd740'];

export function playAchievementConfetti(): () => void {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) return () => {};

  const layer = document.createElement('div');
  layer.dataset.achievementConfetti = '';
  layer.setAttribute('aria-hidden', 'true');
  layer.className = 'pointer-events-none fixed inset-0 z-[60] overflow-hidden';
  document.body.append(layer);

  const animations: Animation[] = [];
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    motion.removeEventListener('change', onMotionChange);
    animations.forEach((animation) => animation.cancel());
    layer.remove();
  };
  const onMotionChange = () => { if (motion.matches) dispose(); };
  motion.addEventListener('change', onMotionChange);

  const width = window.innerWidth;
  const height = window.innerHeight;
  const perSide = width < 640 ? 80 : 120;

  for (const side of ['left', 'right'] as const) {
    for (let index = 0; index < perSide; index++) {
      const piece = document.createElement('span');
      piece.dataset.confettiSide = side;
      const shape = index % 4;
      const size = 6 + Math.random() * 6;
      piece.className = 'absolute bottom-0';
      piece.style[side] = '12px';
      piece.style.width = `${shape === 3 ? size * 0.5 : size}px`;
      piece.style.height = `${shape === 1 || shape === 3 ? size * 2 : size}px`;
      piece.style.borderRadius = shape === 2 ? '50%' : '1px';
      piece.style.backgroundColor = colors[index % colors.length];
      layer.append(piece);

      const direction = side === 'left' ? 1 : -1;
      const travel = width * (0.2 + Math.random() * 0.65);
      const rise = Math.min(height * 0.95, 1000) * (0.5 + Math.random() * 0.5);
      const rotation = Math.random() * 360;
      const spin = direction * (360 + Math.random() * 720);
      const frames = Array.from({ length: 25 }, (_, frame) => {
        const progress = frame / 24;
        const x = direction * travel * (1 - (1 - progress) ** 2);
        const y = -4 * rise * progress * (1 - progress) + 120 * progress * progress;
        return {
          offset: progress,
          transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotation + spin * progress}deg) rotateX(${progress * 720}deg)`,
          opacity: progress === 0 ? 0 : progress < 0.8 ? 1 : (1 - progress) / 0.2,
        };
      });
      animations.push(piece.animate(frames, {
        duration: 2200 + Math.random() * 500,
        delay: index % 3 * 90,
        easing: 'linear',
        fill: 'both',
      }));
    }
  }

  void Promise.all(animations.map((animation) => animation.finished)).then(dispose, dispose);
  return dispose;
}
