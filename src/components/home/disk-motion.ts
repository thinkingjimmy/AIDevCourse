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
  const optical = source.querySelector<HTMLElement>('[data-slot="optical-disc"]');
  if (optical) return insertOpticalDisc(home, source, optical, signal, phase);
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

async function insertOpticalDisc(home: HTMLElement, source: HTMLElement, original: HTMLElement, signal: AbortSignal, phase: (value: DiskPhase) => void) {
  const screen = home.querySelector<HTMLElement>('[data-slot="playstation-screen"]');
  const tray = home.querySelector<HTMLElement>('[data-slot="playstation-tray"]');
  const bed = tray?.firstElementChild;
  const image = screen?.parentElement?.querySelector('img');
  if (!screen || !tray || !bed || !image?.complete || !image.naturalWidth || !tray.getBoundingClientRect().width || !original.offsetWidth) return null;

  home.inert = true;
  phase('lifting');
  await bringScreenIntoView(screen, tray.getBoundingClientRect(), signal);
  signal.throwIfAborted();
  const host = home.getBoundingClientRect();
  const start = original.getBoundingClientRect();
  const slot = tray.getBoundingClientRect();
  const diameter = start.width;
  const seatLeft = (slot.width - diameter) / 2;
  const seatTop = slot.height * .46 - diameter / 2;
  const x = slot.left + seatLeft - start.left;
  const y = slot.top + seatTop - start.top;
  const scale = slot.width * .8 / diameter;
  const pose = (dx: number, dy: number, tilt: number, spin: number, size: number) =>
    `translate3d(${dx}px,${dy}px,0) perspective(600px) rotateX(${tilt}deg) rotateZ(${spin}deg) scale(${size})`;
  const drawerClosed = { transform: 'translateY(-100%)' };
  const drawerOpen = { transform: 'translateY(0)' };
  const flight = visualClone(original);
  flight.classList.add('flying-optical-disc');
  Object.assign(flight.style, { left: `${start.left - host.left}px`, top: `${start.top - host.top}px`, width: `${diameter}px`, height: `${diameter}px` });
  home.appendChild(flight);
  source.dataset.inDrive = '';
  try {
    const [lift] = await Promise.all([
      move(flight, [
        { transform: pose(0, 0, 0, 0, 1), offset: 0 },
        { transform: pose(x * .13, y * .13 - 14, 14, 18, .9), offset: .25 },
        { transform: pose(x, y - 11, 57, 10, scale * 1.08), offset: .82 },
        { transform: pose(x, y, 65, 0, scale), offset: 1 },
      ], 560, signal, 'cubic-bezier(.24,.68,.24,1)'),
      move(bed, [drawerClosed, drawerOpen], 270, signal),
    ]);
    // Keep the seated disc on the drawer so the drive lip hides both together.
    Object.assign(flight.style, { left: `${seatLeft}px`, top: `${seatTop}px`, transform: pose(0, 0, 65, 0, scale) });
    bed.appendChild(flight);
    phase('inserting');
    lift.cancel();
    await move(bed, [drawerOpen, { ...drawerOpen, offset: .18 }, drawerClosed], 290, signal, 'cubic-bezier(.4,0,.6,1)');
    return screen.getBoundingClientRect();
  } finally {
    flight.remove();
    bed.getAnimations().forEach(animation => animation.cancel());
  }
}
