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
  const scroll = bringScreenIntoView(screen, slot, signal);
  let flight: HTMLElement | undefined;
  let pocket: HTMLElement | undefined;
  try {
    if (original) {
      const host = home.getBoundingClientRect(), start = source.getBoundingClientRect();
      const width = source.clientWidth, height = source.clientHeight;
      const scale = Math.min(.8, slot.width * .92 / width), angle = 68;
      const projectedHeight = height * scale * Math.cos(angle * Math.PI / 180);
      const left = start.left - host.left, top = start.top - host.top;
      const x = slot.left + slot.width / 2 - width / 2 - host.left, y = slot.top + slot.height / 2 + 1 - host.top;
      flight = visualClone(original);
      flight.classList.add('flying-course-disk');
      Object.assign(flight.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
      home.appendChild(flight);
      source.dataset.inDrive = '';
      phase('lifting');
      const lift = await move(flight, [
        { transform: getComputedStyle(original).transform, offset: 0 },
        { transform: `translate(${(x - left) * .08}px,-22px) rotate(0deg)`, offset: .18 },
        { transform: `translate(${x - left}px,${y - top}px) rotateX(${angle}deg) scale(${scale})`, offset: 1 },
      ], 330, signal, 'cubic-bezier(.4,0,.22,1)');
      lift.cancel();
      pocket = document.createElement('div');
      pocket.className = 'disk-insertion-pocket';
      Object.assign(pocket.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${projectedHeight + 12}px` });
      home.appendChild(pocket);
      pocket.appendChild(flight);
      Object.assign(flight.style, { left: '0', top: '0' });
      phase('inserting');
      await move(flight, [
        { transform: `translateY(0) rotateX(${angle}deg) scale(${scale})` },
        { transform: `translateY(${-projectedHeight - 8}px) rotateX(${angle}deg) scale(${scale})` },
      ], 130, signal, 'cubic-bezier(.4,0,.6,1)');
    }
    await scroll;
    signal.throwIfAborted();
    return screen.getBoundingClientRect();
  } finally {
    flight?.remove(); pocket?.remove();
  }
}
