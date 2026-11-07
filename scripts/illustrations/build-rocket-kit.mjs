/**
 * Builds an isometric rocket engine SVG using the anatomy kit.
 * Outputs: src/components/illustrations/rocket-explode-markup.ts
 *
 * Engine: simplified Raptor-style staged-combustion engine
 * Parts (explode order, bottom → top):
 *   nozzle    — bell nozzle (lathe, smooth curved profile)
 *   chamber   — combustion chamber + injector dome
 *   collar    — propellant manifold ring
 *   turbopump — turbopump + preburner housing
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as k from "../anatomy/kit/iso-kit.mjs";
import * as G from "../anatomy/kit/lathe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// ── Projection ─────────────────────────────────────────────────────────────
// Engine Z axis = up. Nozzle exit at z=0, turbopump top at z≈340.
// Fit to a 580×540 card crop with generous padding.
const W = 580, H = 540;
const AZIMUTH = 38;   // slightly off 45° so right face is slightly wider
const ELEVATION = 28; // lower than default 30° gives more side area

const ENGINE_Z = 0;   // nozzle exit plane (bottom of engine)
const TOP_Z = 340;    // turbopump dome top

const P = k.fitProjection(
  [
    [-78, -78, ENGINE_Z - 5],
    [ 78,  78, ENGINE_Z - 5],
    [-38, -38, TOP_Z + 5],
    [ 38,  38, TOP_Z + 5],
  ],
  W, H,
  { pad: 40, azimuth: AZIMUTH, elevation: ELEVATION }
);

const S  = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style)     => k.lineSvg(d, style);
const Dt = (pts, style)   => k.dotsSvg(pts, style);
const at = (pt)           => k.iso(pt, P);

// Engine frame: origin at ENGINE_Z, axis +Z
const ENG = G.frameAlong([0, 0, ENGINE_Z], [0, 0, 1]);

// ── Part helpers ────────────────────────────────────────────────────────────
function turned(profile, options = {}) {
  const rmax = Math.max(...profile.map(([, r]) => r));
  return G.solidOf(profile, ENG, P, {
    smooth: options.smooth,
    bevel: options.bevel ?? 0,
    steps: options.steps ?? G.stepsFor(rmax, 40, 96),
  });
}

function band(s0, s1, r, options = {}) {
  return turned([[s0, r], [s1, r]], options);
}

// Visible arc at height s, radius r (crease line)
const arc = (s, r) => G.arcOf(ENG, s, r, P);

// Dot bolt circle on a face
const boltCircle = (s, r, n) => G.dotsOf(ENG, s, r * 0.76, n, P, { all: true });

// ── Nozzle bell ─────────────────────────────────────────────────────────────
// z = 0 (exit) → 120 (throat + diverging section)
// Classic parabolic-ish bell: exit radius 68, throat 26
const bellCurve = (s) => {
  if (s <= 0) return 68;
  if (s >= 120) return 26;
  // Cubic ease from 68 down to 26 over z=0..120
  const t = s / 120;
  return 68 - 42 * (3 * t * t - 2 * t * t * t);
};
const bellSlope = (s) => {
  if (s <= 0 || s >= 120) return 0;
  const t = s / 120;
  return -(42 / 120) * 6 * t * (1 - t);
};

// Nozzle profile (lathe from exit=0 to throat interface=120)
// We build it as bandsOf for smooth shading
const BELL_CUTS = [0, 16, 35, 58, 82, 104, 120];
const BELL_PROFILE = [
  [0, bellCurve(0)],
  ...BELL_CUTS.slice(1, -1).map(s => [s, bellCurve(s), 1]),
  [120, bellCurve(120)],
];

const NOZZLE_BANDS = G.bandsOf(
  [[BELL_PROFILE[0][0], BELL_PROFILE[0][1]], [BELL_PROFILE[BELL_PROFILE.length - 1][0], BELL_PROFILE[BELL_PROFILE.length - 1][1]]],
  BELL_CUTS.slice(1, -1),
  ENG, P,
  { radius: bellCurve, slope: bellSlope, steps: 72, rows: 6 }
);

// Nozzle exit lip
const NOZZLE_LIP = turned([[0, 68], [3, 68], [3, 72]], { bevel: 0.5 });

// Structural hoops on bell (6 of them)
const HOOP_S = [14, 30, 50, 72, 95, 113];
const NOZZLE_HOOPS = HOOP_S.map(s => {
  const r = bellCurve(s) + 1.5;
  return band(s - 1, s + 1, r, { bevel: 0.2 });
});

// Coolant manifold ring near throat
const MANIFOLD_R = bellCurve(108) + 5;
const NOZZLE_MANIFOLD = turned([[106, MANIFOLD_R - 4], [106, MANIFOLD_R], [112, MANIFOLD_R], [112, MANIFOLD_R - 4]], { bevel: 0.4 });

// Halo under nozzle
const HALO_PATH = k.haloOf({ x: -70, y: -70, w: 140, d: 140, r: 70 }, ENGINE_Z - 6, 3, P);

// ── Chamber ─────────────────────────────────────────────────────────────────
// z = 120 → 240
const CH_Z0 = 120, CH_Z1 = 240;
const CH_R  = 36;

// Main cylindrical body
const CHAMBER_BODY = band(CH_Z0, CH_Z0 + 10, CH_R + 2, { bevel: 0.6 }); // flange at bottom
const CHAMBER_WALL = band(CH_Z0 + 10, CH_Z1 - 22, CH_R, {});

// Structural hoops on chamber
const CH_HOOPS = [CH_Z0 + 28, CH_Z0 + 56, CH_Z0 + 84].map(s =>
  band(s, s + 4, CH_R + 1.8, { bevel: 0.3 })
);

// Dome (injector head) — curved top
const domeCurve = (s) => {
  const ds = s - (CH_Z1 - 22);
  const h  = 22; // total dome height
  if (ds <= 0) return CH_R;
  if (ds >= h) return 0.1;
  return CH_R * Math.sqrt(1 - (ds / h) ** 2);
};
const domeSlope = (s) => {
  const ds = s - (CH_Z1 - 22);
  const h  = 22;
  if (ds <= 0 || ds >= h) return 0;
  return -CH_R * (ds / (h * h)) / Math.sqrt(1 - (ds / h) ** 2);
};
const DOME_PROFILE = Array.from({ length: 13 }, (_, i) => {
  const s = (CH_Z1 - 22) + (22 * i) / 12;
  return i === 0 ? [s, domeCurve(s)] :
         i === 12 ? [s, domeCurve(s)] :
         [s, domeCurve(s), 1];
});
const CHAMBER_DOME = G.solidOf(DOME_PROFILE, ENG, P, {
  smooth: { slope: domeSlope, rows: 4 },
  steps: G.stepsFor(CH_R, 40, 96),
});

// ── Collar / manifold ────────────────────────────────────────────────────────
// z = 240 → 270
const COL_Z0 = 240, COL_Z1 = 270;
const COL_R  = 46;

const COLLAR_OUTER = turned([
  [COL_Z0,      CH_R],
  [COL_Z0 + 4,  COL_R],
  [COL_Z1 - 4,  COL_R],
  [COL_Z1,      CH_R + 4],
], { bevel: 0.8 });

// Bolt circles on collar flanges
const COLLAR_BOLTS_BOT = boltCircle(COL_Z0 + 2, CH_R, 16);
const COLLAR_BOLTS_TOP = boltCircle(COL_Z1 - 2, CH_R + 4, 16);

// ── Turbopump ────────────────────────────────────────────────────────────────
// z = 270 → 340 (main body) + dome 340→355
const TP_Z0 = 270, TP_Z1 = 340;
const TP_R  = 32;

const TP_BODY = band(TP_Z0, TP_Z0 + 8, TP_R + 2, { bevel: 0.6 }); // lower flange
const TP_WALL = band(TP_Z0 + 8, TP_Z1 - 10, TP_R, {});

// Volute ring (spirals slightly larger than housing)
const TP_VOLUTE = band(TP_Z0 + 28, TP_Z0 + 45, TP_R + 6, { bevel: 0.4 });

// Turbine ring (slightly wider band)
const TP_TURBINE = band(TP_Z0 + 52, TP_Z0 + 70, TP_R + 4, { bevel: 0.3 });

// Structural rings
const TP_RINGS = [TP_Z0 + 16, TP_Z0 + 80].map(s =>
  band(s, s + 3, TP_R + 1.5, { bevel: 0.2 })
);

// Dome cap
const TP_DOME_PROFILE = [[TP_Z1 - 10, TP_R], [TP_Z1 - 10, TP_R + 2], [TP_Z1, TP_R + 2], [TP_Z1, TP_R * 0.7]];
const TP_CAP = turned(TP_DOME_PROFILE, { bevel: 0.6 });

// Small dome at very top
const tpTopCurve = (s) => {
  const ds = s - TP_Z1;
  const h = 15, r = TP_R * 0.7;
  if (ds <= 0) return r;
  if (ds >= h) return 0.1;
  return r * Math.sqrt(1 - (ds / h) ** 2);
};
const tpTopSlope = (s) => {
  const ds = s - TP_Z1;
  const h = 15, r = TP_R * 0.7;
  if (ds <= 0 || ds >= h) return 0;
  return -r * (ds / (h * h)) / Math.sqrt(1 - (ds / h) ** 2);
};
const TP_TOP_PROFILE = Array.from({ length: 9 }, (_, i) => {
  const s = TP_Z1 + (15 * i) / 8;
  return i === 0 ? [s, tpTopCurve(s)] :
         i === 8 ? [s, tpTopCurve(s)] :
         [s, tpTopCurve(s), 1];
});
const TP_TOPDOME = G.solidOf(TP_TOP_PROFILE, ENG, P, {
  smooth: { slope: tpTopSlope, rows: 4 },
  steps: G.stepsFor(TP_R * 0.7, 32, 72),
});

// Detail dots on turbopump top face
const TP_DOTS = G.dotsOf(ENG, TP_Z1, TP_R * 0.55, 12, P, { all: true });

// ── Assemble SVG groups ──────────────────────────────────────────────────────
function group(id, parts) {
  return `<g data-asm="${id}">${parts.join("")}</g>`;
}

// Painter order: turbopump (back/top) drawn first → nozzle (front/bottom) last
const turbopumpGroup = group("turbopump", [
  S(TP_BODY,    { tone: "hi" }),
  S(TP_WALL,    { tone: "hi", inner: Ln(arc(TP_Z0 + 45, TP_R) + arc(TP_Z0 + 70, TP_R), { tone: "faint" }) }),
  S(TP_VOLUTE,  { tone: "hi" }),
  S(TP_TURBINE, { tone: "hi" }),
  ...TP_RINGS.map(r => S(r, { tone: "mid" })),
  S(TP_CAP,     { tone: "hi" }),
  S(TP_TOPDOME, { tone: "hi" }),
  Dt(TP_DOTS,   { size: 0.42, tone: "mid" }),
]);

const collarGroup = group("collar", [
  S(COLLAR_OUTER, { tone: "hi" }),
  Dt(COLLAR_BOLTS_BOT, { size: 0.38, tone: "mid" }),
  Dt(COLLAR_BOLTS_TOP, { size: 0.38, tone: "mid" }),
  Ln(arc(COL_Z0 + 4, COL_R) + arc(COL_Z1 - 4, COL_R), { tone: "faint" }),
]);

const chamberGroup = group("chamber", [
  S(CHAMBER_BODY, { tone: "hi" }),
  S(CHAMBER_WALL, { tone: "hi", inner: Ln(CH_HOOPS.map(h => arc(h.s, CH_R + 1.8)).join(""), { tone: "faint" }) }),
  ...CH_HOOPS.map(h => S(h, { tone: "mid" })),
  S(CHAMBER_DOME, { tone: "hi" }),
  Dt(boltCircle(CH_Z0 + 6, CH_R + 2, 18), { size: 0.38, tone: "mid" }),
]);

// Nozzle: bandsOf gives us smooth curved bands
const nozzleBandSvgs = NOZZLE_BANDS.bands.map((b, i) => {
  const isSkirt = i === NOZZLE_BANDS.bands.length - 1;
  return S(
    isSkirt ? { ...b.paths, outline: b.outline } : b.paths,
    { tone: "hi", inner: (i === 1 || i === 3) ? Ln(b.seam, { tone: "faint" }) : "" }
  );
});

const nozzleGroup = group("nozzle", [
  `<path class="iso-halo" d="${HALO_PATH}"/>`,
  ...nozzleBandSvgs,
  S(NOZZLE_LIP,      { tone: "hi" }),
  S(NOZZLE_MANIFOLD, { tone: "mid" }),
  ...NOZZLE_HOOPS.map(h => S(h, { tone: "mid" })),
]);

// ── Final SVG ────────────────────────────────────────────────────────────────
const label = "An exploded rocket engine: nozzle bell, combustion chamber, propellant manifold, and turbopump assembly.";
const body  = turbopumpGroup + collarGroup + chamberGroup + nozzleGroup;
const svg   = k.figureSvg({ width: W, height: H, label, body, className: "rocket-iso" });

// Extract just the inner SVG (the <svg>…</svg> element) for embedding
const inner = svg.match(/<svg[\s\S]*<\/svg>/)?.[0] ?? svg;

// ── Write TypeScript output ──────────────────────────────────────────────────
const TS_OUT = join(HERE, "../../src/components/illustrations/rocket-explode-markup.ts");

// The translateAlong vector: anatomy's axisVector maps world-Z to SVG-Y
const EZ = k.axisVector(P, [0, 0, 1]);

const ts = `// Auto-generated by scripts/illustrations/build-rocket-kit.mjs — do not edit by hand.

/** World-Z unit vector in SVG space: used by RocketExplode to translate parts. */
export const ROCKET_UP: [number, number] = [${EZ[0].toFixed(3)}, ${EZ[1].toFixed(3)}];

export const ROCKET_CARD_SVG = ${JSON.stringify(inner)};
`;

writeFileSync(TS_OUT, ts, "utf8");
console.log("wrote rocket-explode-markup.ts", `${(ts.length / 1024).toFixed(0)} KB`);
console.log("EZ vector:", EZ.map(v => v.toFixed(3)).join(", "));
