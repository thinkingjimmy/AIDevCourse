'use client';

import { useEffect, useRef, useState } from 'react';

const SPACING = 26;
const RADIUS = 150;
const DOT_INK = 'rgba(93, 90, 77, 0.30)';
const DOT_LIVE = '#4f6b3a';
const STEM_INK = '#4d6a37';
const LEAF_INK = '#6b8a54';
const LEAF_LIGHT = '#86a36a';
const LEAF_DARK = '#46632f';
const LEAF_EDGE = '#3a5428';

interface Species {
  petal: string; light: string; base: string; edge: string;
  center: string; coreLight: string;
  count: number; wid: number; core: number; notch: boolean;
}

// Every species shares one size range, so flower size is random and independent of colour.
const SIZE_MIN = 6;
const SIZE_MAX = 15;

// Each colour maps to one real flower so its petal count, roundness and centre stay consistent.
const SPECIES: readonly Species[] = [
  // Pink cosmos: broad rounded petals with a small notch at the tip.
  { petal: '#efb1c1', light: '#f9d8e0', base: '#cc6c88', edge: '#b0566f', center: '#d9a23f', coreLight: '#f4d47c', count: 8, wid: 0.46, core: 0.27, notch: true },
  // Yellow coreopsis: wide notched petals around a dark brown centre.
  { petal: '#f2cb68', light: '#f9e3a2', base: '#d0952b', edge: '#b27c1f', center: '#7d5222', coreLight: '#b98540', count: 8, wid: 0.43, core: 0.3, notch: true },
  // Purple aster: many narrow, round-tipped petals around a golden centre.
  { petal: '#b4a3db', light: '#d8cdf0', base: '#8169b8', edge: '#6a559f', center: '#d6a43c', coreLight: '#f2d27b', count: 12, wid: 0.27, core: 0.3, notch: false },
  // White daisy: many short, flat, round-tipped petals around a domed yellow centre.
  { petal: '#fbf8ef', light: '#ffffff', base: '#e0d8c3', edge: '#b7ac92', center: '#d9a536', coreLight: '#f6d97f', count: 16, wid: 0.19, core: 0.33, notch: false },
];

interface LeafSpec { t: number; side: 1 | -1; length: number; width: number; tilt: number; curl: number }
interface Plant {
  kind: 'grass' | 'flower';
  bloomable: boolean;
  samples: Float32Array;
  cells: number;
  leaves: LeafSpec[];
  petals: number;
  size: number;
  tilt: number;
  squash: number;
  spin: number;
  jitter: Float32Array;
  tip: [number, number];
  stem: number;
  growth: number;
  // Optional side branch with a smaller flower; it starts growing once the main stem passes branchAt.
  branch?: Plant;
  branchAt?: number;
}

const clamp01 = (v: number) => v < 0 ? 0 : v > 1 ? 1 : v;
const easeOutBack = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

// One smooth quadratic arc between the two connected dots, sampled densely for partial drawing.
function stemArc(p0: number[], p1: number[], p2: number[]) {
  const out: number[] = [];
  for (let s = 0; s <= 24; s++) {
    const t = s / 24, u = 1 - t;
    out.push(u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]);
  }
  return Float32Array.from(out);
}

export function HoverGardenDemo() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const host = wrap.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!host || !canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: 0, y: 0, active: false };
    let width = 0, height = 0, cols = 0, rows = 0, ox = 0, oy = 0;
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    let energy = new Float32Array(0);
    let plants: (Plant | null)[] = [];
    let raf = 0;

    const headRadius = (p: Plant) => p.bloomable ? p.size : p.size * 0.45;
    // Heads may touch at their petal tips but never cover each other.
    const crowded = (x: number, y: number, r: number) =>
      plants.some((p) => [p, p?.branch].some((h) => h?.kind === 'flower' && Math.hypot(h.tip[0] - x, h.tip[1] - y) < (headRadius(h) + r) * 0.9));

    const makeLeaves = (count: number, big: boolean) => {
      const leaves: LeafSpec[] = [];
      let side: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
      for (let k = 0; k < count; k++) {
        const length = (big ? 9 : 6) + Math.random() * (big ? 7 : 4);
        leaves.push({
          t: 0.14 + (k + Math.random() * 0.6) * (0.66 / Math.max(1, count)),
          side, length, width: length * (0.2 + Math.random() * 0.07),
          tilt: 0.55 + Math.random() * 0.45, curl: (Math.random() - 0.3) * length * 0.18,
        });
        side = side === 1 ? -1 : 1;
      }
      return leaves;
    };

    const makeHead = (kind: Plant['kind'], petals: number, size: number, bloomable: boolean, samples: Float32Array, cells: number, leaves: LeafSpec[], tip: number[], stem: number): Plant => {
      const jitter = new Float32Array(SPECIES[petals].count * 3);
      for (let k = 0; k < jitter.length; k++) jitter[k] = Math.random() - 0.5;
      return {
        kind, bloomable: kind === 'grass' || bloomable, samples, cells, leaves, petals, size,
        tilt: (Math.random() - 0.5) * 0.9,
        squash: 0.72 + Math.random() * 0.28,
        spin: Math.random() * Math.PI * 2,
        jitter, tip: [tip[0], tip[1]], stem, growth: 0,
      };
    };

    const spawnPlant = (ix: number, iy: number): Plant | null => {
      const wantFlower = Math.random() > 0.08;
      let cells = wantFlower ? 2 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);
      cells = Math.min(cells, iy);
      if (cells < 1) return null;
      const root = [xs[iy * cols + ix], ys[iy * cols + ix]];
      const lean = (Math.random() - 0.5) * SPACING * 0.9;
      let tip = [root[0] + lean, root[1] - cells * SPACING];
      let flower = false;
      const petals = Math.floor(Math.random() * SPECIES.length);
      const bloomable = Math.random() < 0.84;
      let size = SIZE_MIN + (SIZE_MAX - SIZE_MIN) * Math.random();
      // In a crowded spot, move the bloom up or down first, then shrink it to fill the gap.
      search: if (wantFlower) for (const shrink of [1, 0.78, 0.6]) {
        const r = Math.max(SIZE_MIN, size * shrink);
        for (const offset of [0, 1, -1, 2, -2, 3]) {
          const c = cells + offset;
          if (c < 1 || c > iy) continue;
          const candidate = [root[0] + lean, root[1] - c * SPACING + (Math.random() - 0.5) * SPACING * 0.6];
          if (crowded(candidate[0], candidate[1], bloomable ? r : r * 0.45)) continue;
          cells = c;
          tip = candidate;
          size = r;
          flower = true;
          break search;
        }
      }
      const bend = (Math.random() - 0.5) * cells * SPACING * 0.3;
      const control = [(root[0] + tip[0]) / 2 + bend, (root[1] + tip[1]) / 2];
      const samples = stemArc(root, control, tip);
      const plant = makeHead(flower ? 'flower' : 'grass', petals, size, bloomable, samples, cells,
        makeLeaves(flower ? 2 + Math.floor(Math.random() * 3) : Math.random() < 0.5 ? 1 : 0, flower), tip, flower ? 1.9 : 1.6);
      if (flower && cells >= 2 && Math.random() < 0.6) {
        const at = 0.42 + Math.random() * 0.22;
        const s0 = Math.round(at * (samples.length / 2 - 1));
        const base = [samples[s0 * 2], samples[s0 * 2 + 1]];
        const dir = Math.random() > 0.5 ? 1 : -1;
        const species = Math.random() < 0.7 ? petals : Math.floor(Math.random() * SPECIES.length);
        const bsize = Math.max(SIZE_MIN, size * (0.55 + Math.random() * 0.2));
        const btip = [base[0] + dir * SPACING * (0.5 + Math.random() * 0.6), base[1] - SPACING * (0.7 + Math.random() * 0.9)];
        const clear = Math.hypot(btip[0] - tip[0], btip[1] - tip[1]) > (size + bsize) * 0.9 && !crowded(btip[0], btip[1], bsize);
        if (clear) {
          const bctrl = [base[0] + dir * SPACING * 0.15, (base[1] + btip[1]) / 2 + SPACING * 0.1];
          plant.branch = makeHead('flower', species, bsize, Math.random() < 0.8, stemArc(base, bctrl, btip), 1, makeLeaves(Math.random() < 0.6 ? 1 : 0, false), btip, 1.2);
          plant.branchAt = at;
        }
      }
      return plant;
    };

    const rebuild = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(1, Math.floor((width - SPACING) / SPACING));
      rows = Math.max(1, Math.floor((height - SPACING) / SPACING));
      ox = (width - (cols - 1) * SPACING) / 2;
      oy = (height - (rows - 1) * SPACING) / 2;
      xs = new Float32Array(cols * rows);
      ys = new Float32Array(cols * rows);
      plants = new Array(cols * rows).fill(null);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        xs[i] = ox + x * SPACING;
        ys[i] = oy + y * SPACING;
      }
      energy = new Float32Array(cols * rows);
      paint();
    };

    // Fills the stem as one shape that tapers from the root to the growing tip, like a brush stroke.
    const taper = (samples: Float32Array, reach: number, w0: number, w1: number) => {
      const left: number[] = [], right: number[] = [];
      for (let s = 0; s < reach; s++) {
        const a = Math.max(0, s - 1), b = Math.min(reach - 1, s + 1);
        const dx = samples[b * 2] - samples[a * 2], dy = samples[b * 2 + 1] - samples[a * 2 + 1];
        const d = Math.hypot(dx, dy) || 1;
        const half = (w0 + (w1 - w0) * (s / Math.max(1, reach - 1))) / 2;
        left.push(samples[s * 2] - (dy / d) * half, samples[s * 2 + 1] + (dx / d) * half);
        right.push(samples[s * 2] + (dy / d) * half, samples[s * 2 + 1] - (dx / d) * half);
      }
      ctx.beginPath();
      ctx.moveTo(left[0], left[1]);
      for (let k = 2; k < left.length; k += 2) ctx.lineTo(left[k], left[k + 1]);
      for (let k = right.length - 2; k >= 0; k -= 2) ctx.lineTo(right[k], right[k + 1]);
      ctx.closePath();
      ctx.fillStyle = STEM_INK;
      ctx.fill();
    };

    // Lance-shaped leaf: base at the origin, tip along +x; curl bends the tip to one side.
    const drawLeaf = (x: number, y: number, angle: number, len: number, wid: number, curl: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(len * 0.22, -wid * 1.15, len * 0.62, -wid * 0.95 + curl * 0.5, len, curl);
      ctx.bezierCurveTo(len * 0.6, wid * 0.75 + curl * 0.5, len * 0.22, wid * 0.95, 0, 0);
      const shade = ctx.createLinearGradient(0, -wid, 0, wid);
      shade.addColorStop(0, LEAF_LIGHT);
      shade.addColorStop(0.55, LEAF_INK);
      shade.addColorStop(1, LEAF_DARK);
      ctx.fillStyle = shade;
      ctx.fill();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = LEAF_EDGE;
      ctx.lineWidth = 0.55;
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#dce6c4';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(len * 0.04, 0);
      ctx.quadraticCurveTo(len * 0.5, curl * 0.3, len * 0.9, curl * 0.92);
      ctx.stroke();
      ctx.restore();
    };

    // Petal outline: narrow at the base, widest near the tip, with a round or notched end.
    const petalPath = (len: number, wid: number, notch: boolean) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(len * 0.18, -wid * 0.7, len * 0.62, -wid * 1.08, len * 0.94, -wid * 0.5);
      if (notch) {
        ctx.quadraticCurveTo(len * 1.04, -wid * 0.24, len * 0.98, -wid * 0.1);
        ctx.quadraticCurveTo(len * 0.93, 0, len * 0.98, wid * 0.1);
        ctx.quadraticCurveTo(len * 1.04, wid * 0.24, len * 0.94, wid * 0.5);
      } else ctx.quadraticCurveTo(len * 1.1, 0, len * 0.94, wid * 0.5);
      ctx.bezierCurveTo(len * 0.62, wid * 1.08, len * 0.18, wid * 0.7, 0, 0);
      ctx.closePath();
    };

    const drawBud = (x: number, y: number, angle: number, size: number, spec: Species) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      petalPath(size, size * 0.42, false);
      const shade = ctx.createLinearGradient(0, 0, size, 0);
      shade.addColorStop(0, spec.base);
      shade.addColorStop(1, spec.petal);
      ctx.fillStyle = shade;
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = spec.edge;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
      for (const side of [-1, 1]) drawLeaf(x, y, angle + side * 0.5, size * 0.55, size * 0.16, 0);
    };

    const drawStem = (plant: Plant): void => {
      const { samples, growth } = plant;
      const total = samples.length / 2;
      const reach = Math.max(2, Math.floor(total * Math.min(1, growth)));
      taper(samples, reach, plant.stem, plant.kind === 'flower' ? plant.stem * 0.42 : 0.25);
      for (const leaf of plant.leaves) {
        const anchor = Math.min(total - 2, Math.floor(leaf.t * (total - 1)));
        const s = clamp01((reach - anchor) / 6);
        if (!s) continue;
        const lx = samples[anchor * 2], ly = samples[anchor * 2 + 1];
        const angle = Math.atan2(samples[(anchor + 1) * 2 + 1] - ly, samples[(anchor + 1) * 2] - lx) + leaf.side * leaf.tilt;
        drawLeaf(lx, ly, angle, leaf.length * s, leaf.width * s, leaf.curl * leaf.side * s);
      }
      const { branch, branchAt = 0 } = plant;
      if (!branch) return;
      branch.growth = clamp01((growth - branchAt) / (1 - branchAt));
      if (branch.growth > 0.02) drawStem(branch);
    };

    const drawHead = (plant: Plant): void => {
      if (plant.branch && plant.branch.growth > 0.02) drawHead(plant.branch);
      const { samples } = plant;
      const total = samples.length / 2;
      const tx = samples[(total - 1) * 2], ty = samples[(total - 1) * 2 + 1];
      const up = Math.atan2(ty - samples[(total - 3) * 2 + 1], tx - samples[(total - 3) * 2]);
      const bloom = clamp01((plant.growth * plant.cells - (plant.cells - 0.5)) / 0.5);
      if (!bloom) return;
      const spec = SPECIES[plant.petals];
      if (!plant.bloomable || bloom < 0.3) {
        const bud = plant.bloomable ? bloom / 0.3 : bloom;
        drawBud(tx, ty, up, plant.size * 0.6 * Math.max(0.05, easeOutBack(bud)), spec);
        return;
      }
      const open = (bloom - 0.3) / 0.7;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(plant.tilt);
      ctx.scale(1, plant.squash);
      for (let k = 0; k < spec.count; k++) {
        // Petals unfold one after another, so the flower visibly opens instead of scaling up.
        const p = clamp01((open - (k / spec.count) * 0.35) / 0.65);
        if (!p) continue;
        const s = Math.max(0.01, easeOutBack(p));
        const len = plant.size * (1 + plant.jitter[k * 3] * 0.16) * s;
        const wid = plant.size * spec.wid * (1 + plant.jitter[k * 3 + 1] * 0.2) * s;
        ctx.save();
        ctx.rotate(plant.spin + (k * Math.PI * 2) / spec.count + plant.jitter[k * 3 + 2] * 0.16);
        petalPath(len, wid, spec.notch);
        const shade = ctx.createLinearGradient(0, 0, len, 0);
        shade.addColorStop(0, spec.base);
        shade.addColorStop(0.38, spec.petal);
        shade.addColorStop(1, spec.light);
        ctx.fillStyle = shade;
        ctx.fill();
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = spec.edge;
        ctx.lineWidth = 0.55;
        ctx.stroke();
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        for (const v of [-0.35, 0, 0.35]) {
          ctx.moveTo(len * 0.18, 0);
          ctx.quadraticCurveTo(len * 0.5, v * wid * 0.5, len * 0.8, v * wid * 0.9);
        }
        ctx.stroke();
        ctx.restore();
      }
      const core = plant.size * spec.core * Math.max(0.3, clamp01(open * 1.6));
      const glow = ctx.createRadialGradient(-core * 0.35, -core * 0.35, core * 0.1, 0, 0, core);
      glow.addColorStop(0, spec.coreLight);
      glow.addColorStop(1, spec.center);
      ctx.beginPath();
      ctx.arc(0, 0, core, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.strokeStyle = 'rgba(70, 50, 25, 0.5)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.fillStyle = 'rgba(70, 45, 20, 0.55)';
      for (let k = 0; k < 9; k++) {
        const r = core * Math.sqrt((k + 0.5) / 9) * 0.8;
        ctx.beginPath();
        ctx.arc(Math.cos(k * 2.4) * r, Math.sin(k * 2.4) * r, Math.max(0.35, core * 0.1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const paint = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = DOT_INK;
      for (let i = 0; i < energy.length; i++) {
        ctx.beginPath();
        ctx.arc(xs[i], ys[i], 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = DOT_LIVE;
      for (let i = 0; i < energy.length; i++) {
        if (energy[i] < 0.1) continue;
        ctx.globalAlpha = energy[i];
        ctx.beginPath();
        ctx.arc(xs[i], ys[i], 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const plant of plants) if (plant && plant.growth > 0.02) drawStem(plant);
      for (const plant of plants) if (plant?.kind === 'flower' && plant.growth > 0.02) drawHead(plant);
    };

    const frame = () => {
      raf = 0;
      let moving = false;
      for (let i = 0; i < energy.length; i++) {
        let target = 0;
        if (pointer.active) {
          const d = Math.hypot(xs[i] - pointer.x, ys[i] - pointer.y);
          target = clamp01(clamp01(1 - d / RADIUS) ** 0.9 * 1.45);
        }
        if (reduced) energy[i] = target;
        else {
          energy[i] += (target - energy[i]) * 0.1;
          if (energy[i] < 0.004 && target === 0) energy[i] = 0;
        }
        if (Math.abs(target - energy[i]) > 0.004) moving = true;

        let plant = plants[i];
        if (!plant && energy[i] > 0.55 && Math.random() < 0.14) plant = plants[i] = spawnPlant(i % cols, Math.floor(i / cols));
        if (plant) {
          const goal = clamp01((energy[i] - 0.2) / 0.5);
          plant.growth += (goal - plant.growth) * (reduced ? 1 : 0.16);
          if (Math.abs(goal - plant.growth) > 0.004) moving = true;
          if (energy[i] < 0.12 && plant.growth < 0.05) plants[i] = null;
        }
      }
      paint();
      if (moving) raf = requestAnimationFrame(frame);
    };

    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const move = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
      setTouched(true);
      wake();
    };
    const leave = () => { pointer.active = false; wake(); };

    rebuild();
    const observer = new ResizeObserver(rebuild);
    observer.observe(host);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerdown', move);
    host.addEventListener('pointerleave', leave);
    return () => {
      observer.disconnect();
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerdown', move);
      host.removeEventListener('pointerleave', leave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <figure data-hover-garden aria-label="悬停时长出花草的互动组件" lang="zh-CN" className="not-prose my-8 overflow-hidden rounded-sm border border-border bg-[#f8f5ee]">
    <div ref={wrap} className="relative h-72 cursor-crosshair touch-pan-y select-none md:h-80 [@media(scripting:none)]:hidden">
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0" />
      <p aria-hidden data-touched={touched} className="pointer-events-none absolute inset-0 m-0 flex items-center justify-center text-sm text-[#8a8471] opacity-100 transition-opacity duration-700 data-[touched=true]:opacity-0">
        移动鼠标，让花园生长
      </p>
    </div>
    <p role="status" className="sr-only">把指针移到点阵上，附近的点会长出花茎、叶子和花朵。</p>
    <noscript>
      <svg viewBox="0 0 640 320" role="img" aria-label="点阵中长出的花草示意图" className="block h-72 w-full md:h-80">
        <defs>
          <pattern id="hover-garden-dots" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="13" cy="13" r="1.5" fill="rgba(93, 90, 77, 0.3)" />
          </pattern>
        </defs>
        <rect width="640" height="320" fill="url(#hover-garden-dots)" />
        {[[180, 250, '#e7a3b4', '#c96b82'], [270, 230, '#f0d07e', '#cf9f43'], [360, 245, '#b4a1d8', '#7d67ad'], [450, 235, '#faf8f1', '#d3a94e']].map(([x, y, petal, heart]) =>
          <g key={x as number}>
            <path d={`M${x} 300 Q ${(x as number) + 8} ${(y as number) + 30} ${(x as number) + 4} ${y}`} stroke={STEM_INK} strokeWidth="1.4" fill="none" />
            <ellipse cx={(x as number) - 6} cy={(y as number) + 32} rx="6" ry="2.4" fill={LEAF_INK} transform={`rotate(-30 ${(x as number) - 6} ${(y as number) + 32})`} />
            {[0, 1, 2, 3, 4].map((k) =>
              <ellipse key={k} cx={(x as number) + 4 + Math.cos(k * Math.PI * 0.4) * 4} cy={(y as number) + Math.sin(k * Math.PI * 0.4) * 4} rx="4" ry="2.2" fill={petal as string} stroke={heart as string} strokeWidth="0.7" transform={`rotate(${k * 72} ${(x as number) + 4 + Math.cos(k * Math.PI * 0.4) * 4} ${(y as number) + Math.sin(k * Math.PI * 0.4) * 4})`} />)}
            <circle cx={(x as number) + 4} cy={y as number} r="2.6" fill={heart as string} />
          </g>)}
      </svg>
    </noscript>
  </figure>;
}
