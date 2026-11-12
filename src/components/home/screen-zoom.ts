import type { HomeView } from '@/lib/i18n/routing';

type ScreenZoom = { direction: 'in'; glass: DOMRect } | { direction: 'out'; view: HomeView };

function cameraProperties(glass: DOMRect) {
  // Root snapshots include scrollbar gutters, unlike documentElement.clientWidth.
  const width = window.innerWidth;
  const height = window.innerHeight;
  // Travel just past the rounded glass so its corners clear the final viewport.
  const scale = Math.min(glass.width / width, glass.height / height) * .96;
  const x = glass.left + (glass.width - width * scale) / 2;
  const y = glass.top + (glass.height - height * scale) / 2;

  // The two snapshots share a camera. Only the crop inside the glass changes shape.
  return {
    '--course-camera-from': `translate(${x}px, ${y}px) scale(${scale})`,
    '--home-camera-to': `translate(${-x / scale}px, ${-y / scale}px) scale(${1 / scale})`,
    '--glass-pad-x': `${(glass.width / scale - width) / 2}px`,
    '--glass-pad-y': `${(glass.height / scale - height) / 2}px`,
    '--glass-cover': String(Math.max(glass.width / width, glass.height / height) / scale),
  };
}

async function homeScreen(view: HomeView, signal: AbortSignal) {
  const playStation = view === 'resources';
  const screen = document.querySelector(playStation
    ? '[data-slot="home-playstation"] [data-slot="playstation-screen"]'
    : '[data-slot="home-macintosh"] [data-slot="mac-screen"]');
  if (!screen) return;
  const artwork = playStation ? screen.parentElement?.querySelector('img') : undefined;
  const measure = () => {
    const bounds = screen.getBoundingClientRect();
    return bounds.width && bounds.height && (!artwork || (artwork.complete && artwork.naturalWidth)) ? bounds : undefined;
  };
  const deadline = performance.now() + 300;
  let bounds = measure();
  // A direct visit may return home before its device artwork is ready.
  while (!bounds && !signal.aborted && performance.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 16));
    bounds = measure();
  }
  return bounds;
}

async function zoomScreen(motion: ScreenZoom, navigate: () => Promise<void>, signal: AbortSignal) {
  signal.throwIfAborted();
  const root = document.documentElement;
  let camera: ReturnType<typeof cameraProperties> | undefined;
  const frame = (bounds: DOMRect) => {
    camera = cameraProperties(bounds);
    for (const [name, value] of Object.entries(camera)) root.style.setProperty(name, value);
  };
  if (motion.direction === 'in') frame(motion.glass);
  root.dataset.courseZoom = motion.direction;
  try {
    const view = document.startViewTransition(async () => {
      await navigate();
      if (motion.direction === 'out') {
        const destination = await homeScreen(motion.view, signal);
        if (destination && !signal.aborted) frame(destination);
        else view.skipTransition();
      }
    });
    const skip = () => view.skipTransition();
    // Cancellation may reject ready; route latency alone must not cancel the camera.
    void view.ready.catch(() => {});
    signal.addEventListener('abort', skip, { once: true });
    if (signal.aborted) skip();
    try { await view.finished; }
    finally { signal.removeEventListener('abort', skip); }
  } finally {
    delete root.dataset.courseZoom;
    for (const name of Object.keys(camera ?? {})) root.style.removeProperty(name);
  }
}

export function zoomIntoScreen(glass: DOMRect, navigate: () => Promise<void>, signal: AbortSignal) {
  return zoomScreen({ direction: 'in', glass }, navigate, signal);
}

export function zoomOutOfScreen(view: HomeView, navigate: () => Promise<void>, signal: AbortSignal) {
  return zoomScreen({ direction: 'out', view }, navigate, signal);
}
