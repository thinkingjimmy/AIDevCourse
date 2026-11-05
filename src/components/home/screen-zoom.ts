function cameraProperties(glass: DOMRect) {
  const root = document.documentElement;
  const width = root.clientWidth;
  const height = root.clientHeight;
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

async function homeScreen(signal: AbortSignal) {
  const screen = document.querySelector('[data-slot="home-macintosh"] [data-slot="mac-screen"]');
  if (!screen) return;
  const deadline = performance.now() + 300;
  let bounds = screen.getBoundingClientRect();
  // A direct course visit may not have loaded the external Macintosh artwork yet.
  while (!bounds.width && !signal.aborted && performance.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 16));
    bounds = screen.getBoundingClientRect();
  }
  return bounds.width && bounds.height ? bounds : undefined;
}

async function zoomScreen(direction: 'in' | 'out', navigate: () => Promise<void>, signal: AbortSignal, glass?: DOMRect) {
  const root = document.documentElement;
  let camera: ReturnType<typeof cameraProperties> | undefined;
  const frame = (bounds: DOMRect) => {
    camera = cameraProperties(bounds);
    for (const [name, value] of Object.entries(camera)) root.style.setProperty(name, value);
  };
  if (glass) frame(glass);
  root.dataset.courseZoom = direction;
  try {
    const view = document.startViewTransition(async () => {
      await navigate();
      if (direction === 'out') {
        const destination = await homeScreen(signal);
        if (destination && !signal.aborted) frame(destination);
        else view.skipTransition();
      }
    });
    const skip = () => view.skipTransition();
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
  return zoomScreen('in', navigate, signal, glass);
}

export function zoomOutOfScreen(navigate: () => Promise<void>, signal: AbortSignal) {
  return zoomScreen('out', navigate, signal);
}
