import { visualClone } from '../disk-motion';

type Flight = { cancel: () => void; retarget: () => void };
type CategoryTarget = { section: HTMLElement; tab: HTMLElement; fan: HTMLElement };
type CollectedDisk = {
  link: HTMLAnchorElement;
  cover: HTMLElement;
  target: CategoryTarget;
  position?: 'above' | 'visible' | 'below';
  flight?: Flight;
};

function collect(disk: CollectedDisk, box: DOMRect, top: number, margin: number, deck: HTMLElement) {
  const { link, cover, target: { tab, fan } } = disk;
  const y = Math.max(box.top, top + margin - box.height);
  const centerX = box.left + box.width / 2;
  const centerY = y + box.height / 2;
  const pose = (x: number, y: number, scale: number, angle = 0) => `translate3d(${x}px,${y}px,0) rotate(${angle}deg) scale(${scale})`;
  const frames = () => {
    const destination = (tab.hasAttribute('aria-current') ? fan : tab).getBoundingClientRect();
    const dx = destination.left + destination.width / 2 - centerX;
    const dy = destination.top + destination.height / 2 - centerY;
    return [
      { transform: pose(0, 0, 1), opacity: 1 },
      { transform: pose(dx * .55, top + 10 - centerY, .44, Math.sign(dx) * 12), opacity: 1, offset: .5 },
      { transform: pose(dx, dy, .12), opacity: .6 },
    ];
  };

  const flight = visualClone(cover);
  flight.classList.add('course-category-flight');
  Object.assign(flight.style, {
    left: `${box.left}px`, top: `${y}px`, width: `${box.width}px`, height: `${box.height}px`, color: getComputedStyle(cover).color,
  });
  deck.appendChild(flight);
  link.dataset.collected = '';
  const animation = flight.animate(frames(), { duration: 230, easing: 'cubic-bezier(.32,.72,.26,1)' });
  const remove = () => flight.remove();
  void animation.finished.then(remove, remove);

  return {
    cancel() {
      animation.cancel();
      remove();
      delete link.dataset.collected;
    },
    retarget() {
      if (flight.isConnected && animation.effect instanceof KeyframeEffect) animation.effect.setKeyframes(frames());
    },
  };
}

export function createDiskCollection(deck: HTMLElement, sections: CategoryTarget[]) {
  const disks: CollectedDisk[] = sections.flatMap(target =>
    Array.from(target.section.querySelectorAll<HTMLAnchorElement>('.course-disk-link')).flatMap(link => {
      const cover = link.querySelector<HTMLElement>('[data-slot="course-disk"]');
      return cover ? [{ link, cover, target }] : [];
    }),
  );

  return {
    retarget() {
      for (const disk of disks) disk.flight?.retarget();
    },
    clear() {
      for (const disk of disks) {
        disk.flight?.cancel();
        disk.flight = undefined;
        disk.position = undefined;
      }
    },
    update(top: number, bottom: number, direction: number) {
      const positions = disks.map(disk => ({ disk, box: disk.link.getBoundingClientRect() }));
      for (const { disk, box } of positions) {
        const margin = Math.min(64, box.height / 2, (bottom - top) / 2);
        const position = box.bottom < top + margin ? 'above' : box.top > bottom - margin ? 'below' : 'visible';
        if (position === disk.position) continue;

        const exitingAtTop = disk.position === 'visible' && position === 'above' && direction > 0;
        disk.position = position;
        disk.flight?.cancel();
        disk.flight = undefined;
        if (exitingAtTop && margin > 0 && !disk.link.matches(':focus-visible, [data-in-drive]')) {
          disk.flight = collect(disk, box, top, margin, deck);
        }
      }
    },
  };
}
