import Image from 'next/image';
import Link from 'next/link';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Macintosh } from './macintosh';

export type HomeView = 'courses' | 'resources';
export type SwitchDirection = -1 | 1;
export type HomeOrbit = { animations: Animation[]; start: number; end: number };

const playStationArtwork = '/images/home/pixel-playstation.webp';
const halfTurn = Math.PI;

function restAngle(view: HomeView) { return view === 'resources' ? halfTurn : 0; }

function deviceFrame(device: HomeView, angle: number) {
  // The devices share one ellipse and stay half a turn apart.
  const phase = angle + restAngle(device);
  const depth = (Math.cos(phase) + 1) / 2;
  const bend = Math.sin(phase);
  const x = -11 + 30 * depth + 8 * bend;
  const y = -19 + 19 * depth - 10 * bend;
  return {
    transform: `translate(${x.toFixed(3)}%, ${y.toFixed(3)}%) scale(${(.82 + .18 * depth).toFixed(4)})`,
    opacity: .44 + .56 * depth,
    zIndex: depth >= .5 ? 2 : 1,
  };
}

function motionFrame(element: Element) {
  const { transform, opacity, zIndex } = getComputedStyle(element);
  return { transform, opacity, zIndex };
}

export function orbitDevices(home: HTMLElement, from: HomeView, to: HomeView, direction: SwitchDirection, previous?: HomeOrbit) {
  const progress = previous?.animations[0].effect?.getComputedTiming().progress ?? 0;
  const start = previous ? previous.start + (previous.end - previous.start) * progress : restAngle(from);
  const fullTurn = 2 * halfTurn;
  const rest = restAngle(to);
  const turns = (start - rest) / fullTurn;
  const round = direction > 0 ? Math.floor(turns + 1e-6) + 1 : Math.ceil(turns - 1e-6) - 1;
  const end = rest + round * fullTurn;
  const duration = Math.max(190, Math.min(590, 510 * Math.abs(end - start) / halfTurn));
  const timing: KeyframeAnimationOptions = { duration, easing: 'cubic-bezier(.34,.06,.26,1)', fill: 'both' };
  const frames = [...home.querySelectorAll<HTMLElement>('[data-home-device]')].map(device => {
    const view = device.dataset.homeDevice as HomeView;
    const poses: Keyframe[] = Array.from({ length: 21 }, (_, step) => deviceFrame(view, start + (end - start) * step / 20));
    if (previous) poses[0] = motionFrame(device);
    return { element: device, poses };
  });
  const offset = Math.min(32, home.clientWidth * .07) * direction;
  const slide = (distance: number) => ({ transform: `translateX(${distance}px)`, opacity: 0 });
  const resting = { transform: 'translateX(0)', opacity: 1 };
  const outgoing = home.querySelector(`[data-gallery-view="${from}"]`);
  const incoming = home.querySelector(`[data-gallery-view="${to}"]`);
  if (outgoing) frames.push({ element: outgoing as HTMLElement, poses: [previous ? motionFrame(outgoing) : resting, slide(-offset)] });
  if (incoming) frames.push({ element: incoming as HTMLElement, poses: [previous ? motionFrame(incoming) : slide(offset), resting] });
  previous?.animations.forEach(animation => animation.cancel());
  return { start, end, animations: frames.map(({ element, poses }) => element.animate(poses, timing)) };
}

function PlayStation({ title, status }: { title?: string; status?: string }) {
  return <div className="pixel-playstation" data-slot="home-playstation">
    <Image src={playStationArtwork} alt="" width={384} height={384} loading="eager" unoptimized />
    <div className="playstation-screen" data-slot="playstation-screen">
      {title ? <><span className="pixel-screen-title">{title}</span>{status && <span className="pixel-screen-status">{status}</span>}</>
        : <span className="playstation-greeting">hello.</span>}
    </div>
    <span className="playstation-tray" data-slot="playstation-tray"><span className="playstation-tray-bed" /></span>
  </div>;
}

export function HomeDeviceStage({ view, title, status, href, labels, onSwitch, onKeyDown }: {
  view: HomeView; title?: string; status?: string; href: string;
  labels: { group: string; previous: string; next: string };
  onSwitch: (event: MouseEvent<HTMLAnchorElement>, direction: SwitchDirection) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}) {
  const angle = restAngle(view);
  return <div data-slot="home-hero-art" className="gallery-computer" role="group" aria-label={labels.group} onKeyDown={onKeyDown}>
    <Link className="gallery-view-arrow" data-direction="previous" href={href} aria-label={labels.previous}
      scroll={false} prefetch={false} onClick={event => onSwitch(event, -1)}><span aria-hidden>&lt;</span></Link>
    <div className="gallery-device-stage" aria-hidden>
      <div className="gallery-device" data-home-device="courses" style={deviceFrame('courses', angle)}>
        <Macintosh title={view === 'courses' ? title : undefined} status={status} />
      </div>
      <div className="gallery-device" data-home-device="resources" style={deviceFrame('resources', angle)}>
        <PlayStation title={view === 'resources' ? title : undefined} status={status} />
      </div>
    </div>
    <Link className="gallery-view-arrow" data-direction="next" href={href} aria-label={labels.next}
      scroll={false} prefetch={false} onClick={event => onSwitch(event, 1)}><span aria-hidden>&gt;</span></Link>
  </div>;
}
