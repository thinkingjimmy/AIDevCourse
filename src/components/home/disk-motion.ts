export type DiskPhase = 'idle' | 'lifting' | 'inserting' | 'navigating';
export type DiskEntry = { home: HTMLElement; source: HTMLElement; url: string };

async function move(element: Element, frames: Keyframe[], duration: number, signal: AbortSignal, easing = 'cubic-bezier(.32,.72,0,1)') {
  signal.throwIfAborted();
  const animation = element.animate(frames, { duration, easing, fill: 'forwards' });
  const cancel = () => animation.cancel();
  signal.addEventListener('abort', cancel, { once: true });
  try { await animation.finished; }
  finally { signal.removeEventListener('abort', cancel); }
  signal.throwIfAborted();
  return animation;
}

function visualClone(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach(item => item.removeAttribute('id'));
  clone.setAttribute('aria-hidden', 'true');
  clone.inert = true;
  return clone;
}

function bringScreenIntoView(screen: Element, slot: DOMRect, signal: AbortSignal) {
  const glass = screen.getBoundingClientRect();
  const header = document.querySelector('[data-slot="site-header"]')?.getBoundingClientRect();
  if (glass.top >= (header?.bottom ?? 0) && slot.bottom <= window.innerHeight) return;

  // Finish the scroll before measuring the glass for the camera.
  return new Promise<void>(resolve => {
    function finish() {
      clearTimeout(timeout);
      document.removeEventListener('scrollend', finish);
      signal.removeEventListener('abort', stop);
      resolve();
    }
    function stop() {
      window.scrollTo({ top: window.scrollY, behavior: 'instant' });
      finish();
    }
    const timeout = setTimeout(stop, 750);
    document.addEventListener('scrollend', finish, { once: true });
    signal.addEventListener('abort', stop, { once: true });
    screen.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}

export async function insertDisk(entry: DiskEntry, signal: AbortSignal, phase: (value: DiskPhase) => void) {
  const { home, source } = entry;
  const screen = home.querySelector<SVGGElement>('[data-slot="mac-screen"]');
  const drive = home.querySelector<SVGUseElement>('[data-slot="mac-drive"]');
  if (!screen || !drive) return null;
  const slot = drive.getBoundingClientRect();
  // An external SVG layer has no geometry until its artwork has loaded.
  if (!slot.width || !screen.getBoundingClientRect().width) return null;
  const original = source.querySelector<HTMLElement>('[data-slot="course-disk"]');
  const host = home.getBoundingClientRect(), start = source.getBoundingClientRect();
  const width = source.clientWidth, height = source.clientHeight;
  const initialTransform = original ? getComputedStyle(original).transform : 'none';
  const scroll = bringScreenIntoView(screen, slot, signal);
  home.inert = true;
  let flight: HTMLElement | undefined;
  let pocket: HTMLElement | undefined;
  try {
    if (original) {
      const scale = Math.min(.8, slot.width * .92 / width), angle = 68;
      const projectedHeight = height * scale * Math.cos(angle * Math.PI / 180);
      const left = start.left - host.left, top = start.top - host.top;
      const x = slot.left + slot.width / 2 - width / 2 - host.left, y = slot.top + slot.height / 2 + 1 - host.top;
      flight = visualClone(original);
      flight.classList.add('flying-course-disk');
      Object.assign(flight.style, { left: '0', top: '0', width: `${width}px`, height: `${height}px` });
      // Keep the disk in one layer throughout the flight and drive insertion.
      pocket = document.createElement('div');
      pocket.className = 'disk-insertion-pocket';
      Object.assign(pocket.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${projectedHeight + 12}px` });
      pocket.appendChild(flight);
      home.appendChild(pocket);
      source.dataset.inDrive = '';
      phase('lifting');
      const lift = await move(flight, [
        { transform: `translate3d(${left - x}px,${top - y}px,0) ${initialTransform === 'none' ? '' : initialTransform}`, offset: 0 },
        { transform: `translate3d(${(left - x) * .92}px,${top - y - 22}px,0) rotateX(0deg) scale(1)`, offset: .18 },
        { transform: `translate3d(0,0,0) rotateX(${angle}deg) scale(${scale})`, offset: 1 },
      ], 330, signal, 'cubic-bezier(.4,0,.22,1)');
      lift.cancel();
      pocket.style.overflow = 'hidden';
      phase('inserting');
      await move(flight, [
        { transform: `translate3d(0,0,0) rotateX(${angle}deg) scale(${scale})` },
        { transform: `translate3d(0,${-projectedHeight - 8}px,0) rotateX(${angle}deg) scale(${scale})` },
      ], 130, signal, 'cubic-bezier(.4,0,.6,1)');
    }
    await scroll;
    signal.throwIfAborted();
    return screen.getBoundingClientRect();
  } finally {
    flight?.remove(); pocket?.remove();
  }
}
