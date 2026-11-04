export type AnimationChannel = { delay: number; duration: number; paint: (amount: number) => void };
const HOVER_PAUSE = 0.6;

export function translatePart(element: Element, vector: readonly [number, number], amount: number) {
  if (amount <= 0.0005) element.removeAttribute('transform');
  else element.setAttribute('transform', `translate(${(vector[0] * amount).toFixed(2)} ${(vector[1] * amount).toFixed(2)})`);
}

export function animateIllustration(root: HTMLElement, definitions: AnimationChannel[], options: { intro: number; ease: (amount: number) => number; loopOnHover?: boolean }) {
  const hoverRoot = root.closest<HTMLElement>('[data-illustration-hover]') ?? root;
  const expandOnHover = hoverRoot.dataset.illustrationHover === 'expand';
  const channels = definitions.map((channel) => ({ ...channel, position: 0, delayLeft: 0 }));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  let frame = 0;
  let last = 0;
  let visible = false;
  let target: 0 | 1 = expandOnHover ? 0 : 1;
  let intro = expandOnHover ? 0 : options.intro;
  let hovered = false;
  let holdLeft = HOVER_PAUSE;

  const paint = () => channels.forEach((channel) => channel.paint(options.ease(channel.position)));
  const settled = () => intro <= 0 && channels.every((channel) => channel.delayLeft <= 0 && channel.position === target);
  const looping = () => !expandOnHover && options.loopOnHover === true && hovered;
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
    const elapsed = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!settled()) step(elapsed);
    else if (looping()) {
      holdLeft -= elapsed;
      if (holdLeft <= 0) retarget(target === 1 ? 0 : 1);
    }
    if (settled()) root.dataset.settled = String(target === 1);
    if (!settled() || looping()) frame = requestAnimationFrame(tick);
    else {
      frame = 0;
      last = 0;
    }
  };
  const start = () => {
    if (!frame && !reduce.matches && visible && (!settled() || looping())) frame = requestAnimationFrame(tick);
  };
  const retarget = (next: 0 | 1) => {
    if (reduce.matches || target === next) return;
    target = next;
    intro = 0;
    holdLeft = HOVER_PAUSE;
    root.dataset.settled = 'false';
    channels.forEach((channel) => {
      channel.delayLeft = expandOnHover && channel.position > 0 && channel.position < 1 ? 0 : channel.delay;
    });
    start();
  };
  const sync = () => {
    if (reduce.matches) {
      stop();
      intro = 0;
      target = expandOnHover ? 0 : 1;
      holdLeft = HOVER_PAUSE;
      channels.forEach((channel) => { channel.position = target; channel.delayLeft = 0; });
      paint();
      root.dataset.settled = String(target === 1);
    } else if (!visible) stop();
    else start();
  };
  const onEnter = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || !hover.matches) return;
    hovered = true;
    retarget(expandOnHover ? 1 : 0);
  };
  const onLeave = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    hovered = false;
    retarget(expandOnHover ? 0 : 1);
  };
  root.dataset.settled = 'false';
  paint();
  hovered = hover.matches && hoverRoot.matches(':hover');
  if (hovered) retarget(expandOnHover ? 1 : 0);
  sync();
  hoverRoot.addEventListener('pointerenter', onEnter);
  hoverRoot.addEventListener('pointerleave', onLeave);
  const observer = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
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
