/**
 * [INPUT]: A decorative element, optional data-illustration-hover ancestor, timed paint channels, and illustration-specific easing.
 * [OUTPUT]: animateIllustration lifecycle cleanup and translatePart SVG positioning.
 * [POS]: Shared animation driver for Mac and chip artwork; React owns mount and cleanup.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
export type AnimationChannel = { delay: number; duration: number; paint: (amount: number) => void };

export function translatePart(element: Element, vector: readonly [number, number], amount: number) {
  if (amount <= 0.0005) element.removeAttribute('transform');
  else element.setAttribute('transform', `translate(${(vector[0] * amount).toFixed(2)} ${(vector[1] * amount).toFixed(2)})`);
}

export function animateIllustration(root: HTMLElement, definitions: AnimationChannel[], options: { intro: number; ease: (amount: number) => number }) {
  const hoverRoot = root.closest<HTMLElement>('[data-illustration-hover]') ?? root;
  const channels = definitions.map((channel) => ({ ...channel, position: 0, delayLeft: 0 }));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let last = 0;
  let visible = false;
  let target: 0 | 1 = 1;
  let intro = options.intro;

  const paint = () => channels.forEach((channel) => channel.paint(options.ease(channel.position)));
  const settled = () => intro <= 0 && channels.every((channel) => channel.delayLeft <= 0 && channel.position === target);
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  };
  const step = (elapsed: number) => {
    if (intro > 0 && target === 1) {
      intro -= elapsed;
      if (intro > 0) return;
      elapsed = -intro;
      intro = 0;
      channels.forEach((channel) => { channel.delayLeft = channel.delay; });
    }
    for (const channel of channels) {
      let slice = elapsed;
      if (channel.delayLeft > 0) {
        channel.delayLeft -= slice;
        if (channel.delayLeft > 0) continue;
        slice = -channel.delayLeft;
        channel.delayLeft = 0;
      }
      if (channel.position === target || slice <= 0) continue;
      const delta = slice / channel.duration;
      channel.position = target > channel.position ? Math.min(target, channel.position + delta) : Math.max(target, channel.position - delta);
    }
    paint();
  };
  const tick = (now: number) => {
    if (!last) last = now;
    step(Math.min(0.05, (now - last) / 1000));
    last = now;
    if (settled()) {
      root.dataset.settled = String(target === 1);
      frame = 0;
      last = 0;
    } else frame = requestAnimationFrame(tick);
  };
  const start = () => {
    if (!frame && !reduce.matches && visible && !settled()) frame = requestAnimationFrame(tick);
  };
  const retarget = (next: 0 | 1) => {
    if (reduce.matches || target === next) return;
    target = next;
    intro = 0;
    root.dataset.settled = 'false';
    channels.forEach((channel) => { channel.delayLeft = channel.delay; });
    start();
  };
  const sync = () => {
    if (reduce.matches) {
      stop();
      intro = 0;
      target = 1;
      channels.forEach((channel) => { channel.position = 1; channel.delayLeft = 0; });
      paint();
      root.dataset.settled = 'true';
    } else if (!visible) stop();
    else start();
  };
  const onEnter = (event: PointerEvent) => { if (event.pointerType !== 'touch') retarget(0); };
  const onLeave = (event: PointerEvent) => { if (event.pointerType !== 'touch') retarget(1); };
  root.dataset.settled = 'false';
  paint();
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && hoverRoot.matches(':hover')) retarget(0);
  sync();
  hoverRoot.addEventListener('pointerenter', onEnter);
  hoverRoot.addEventListener('pointerleave', onLeave);
  const observer = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    sync();
  });
  observer.observe(root);
  reduce.addEventListener('change', sync);
  return () => {
    stop();
    observer.disconnect();
    reduce.removeEventListener('change', sync);
    hoverRoot.removeEventListener('pointerenter', onEnter);
    hoverRoot.removeEventListener('pointerleave', onLeave);
  };
}
