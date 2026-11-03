/**
 * Generates the isometric rocket engine SVG for the coding-101 course card.
 * Uses 2:1 isometric projection at 45° azimuth following the project's anatomy style.
 *
 * Output: src/components/illustrations/rocket-explode-markup.ts
 */

const SVG_W = 580, SVG_H = 570;
const CX = 290, CY = 348; // center, shifted down to give nozzle room
const S = 1.45; // scale: SVG px per world unit
const A_PER_R = S * Math.SQRT2;   // horizontal semi-axis per radius unit
const B_PER_R = S * Math.SQRT2 / 2; // vertical semi-axis per radius unit
const K = 0.5523; // bezier kappa for ellipse approximation

function f(n) { return (Math.round(n * 10) / 10).toFixed(1); }

// Ellipse parameters for a given radius r at world height z
function E(r, z) {
  return { cx: CX, cy: CY - z * S, a: r * A_PER_R, b: r * B_PER_R };
}

// Full ellipse path (top face, drawn clockwise starting at right tangent)
function topEllipse(r, z) {
  const { cx, cy, a, b } = E(r, z);
  return [
    `M${f(cx+a)},${f(cy)}`,
    `C${f(cx+a)},${f(cy-K*b)} ${f(cx+K*a)},${f(cy-b)} ${f(cx)},${f(cy-b)}`,
    `C${f(cx-K*a)},${f(cy-b)} ${f(cx-a)},${f(cy-K*b)} ${f(cx-a)},${f(cy)}`,
    `C${f(cx-a)},${f(cy+K*b)} ${f(cx-K*a)},${f(cy+b)} ${f(cx)},${f(cy+b)}`,
    `C${f(cx+K*a)},${f(cy+b)} ${f(cx+a)},${f(cy+K*b)} ${f(cx+a)},${f(cy)}Z`,
  ].join('');
}

// Front-half of ellipse only (visible bottom arc from right tangent → left tangent)
function frontEllipseHalf(r, z) {
  const { cx, cy, a, b } = E(r, z);
  return [
    `M${f(cx+a)},${f(cy)}`,
    `C${f(cx+a)},${f(cy+K*b)} ${f(cx+K*a)},${f(cy+b)} ${f(cx)},${f(cy+b)}`,
    `C${f(cx-K*a)},${f(cy+b)} ${f(cx-a)},${f(cy+K*b)} ${f(cx-a)},${f(cy)}`,
  ].join('');
}

// Frustum (truncated cone) visible front fill — whole visible silhouette
function frustumFill(rt, zt, rb, zb) {
  const T = E(rt, zt), B = E(rb, zb), cx = CX;
  return [
    // Top half-ellipse (back arc, going counter-clockwise from right to left via top)
    `M${f(cx+T.a)},${f(T.cy)}`,
    `C${f(cx+T.a)},${f(T.cy-K*T.b)} ${f(cx+K*T.a)},${f(T.cy-T.b)} ${f(cx)},${f(T.cy-T.b)}`,
    `C${f(cx-K*T.a)},${f(T.cy-T.b)} ${f(cx-T.a)},${f(T.cy-K*T.b)} ${f(cx-T.a)},${f(T.cy)}`,
    // Left edge down
    `L${f(cx-B.a)},${f(B.cy)}`,
    // Bottom front half ellipse (left to right via front)
    `C${f(cx-B.a)},${f(B.cy+K*B.b)} ${f(cx-K*B.a)},${f(B.cy+B.b)} ${f(cx)},${f(B.cy+B.b)}`,
    `C${f(cx+K*B.a)},${f(B.cy+B.b)} ${f(cx+B.a)},${f(B.cy+K*B.b)} ${f(cx+B.a)},${f(B.cy)}`,
    // Right edge up
    `Z`,
  ].join('');
}

// Right face of frustum (shade-0, darkest — east-facing)
function frustumRight(rt, zt, rb, zb) {
  const T = E(rt, zt), B = E(rb, zb), cx = CX;
  return [
    `M${f(cx+T.a)},${f(T.cy)}`,
    `L${f(cx+B.a)},${f(B.cy)}`,
    `C${f(cx+B.a)},${f(B.cy+K*B.b)} ${f(cx+K*B.a)},${f(B.cy+B.b)} ${f(cx)},${f(B.cy+B.b)}`,
    `L${f(cx)},${f(T.cy+T.b)}`,
    `C${f(cx+K*T.a)},${f(T.cy+T.b)} ${f(cx+T.a)},${f(T.cy+K*T.b)} ${f(cx+T.a)},${f(T.cy)}Z`,
  ].join('');
}

// Left face of frustum (shade-3, lightest side — west-facing, toward light)
function frustumLeft(rt, zt, rb, zb) {
  const T = E(rt, zt), B = E(rb, zb), cx = CX;
  return [
    `M${f(cx-T.a)},${f(T.cy)}`,
    `L${f(cx-B.a)},${f(B.cy)}`,
    `C${f(cx-B.a)},${f(B.cy+K*B.b)} ${f(cx-K*B.a)},${f(B.cy+B.b)} ${f(cx)},${f(B.cy+B.b)}`,
    `L${f(cx)},${f(T.cy+T.b)}`,
    `C${f(cx-K*T.a)},${f(T.cy+T.b)} ${f(cx-T.a)},${f(T.cy+K*T.b)} ${f(cx-T.a)},${f(T.cy)}Z`,
  ].join('');
}

// Crease line at top-face edge (front half of top ellipse, drawn as a line)
function creaseLine(r, z) {
  const { cx, cy, a, b } = E(r, z);
  return [
    `M${f(cx+a)},${f(cy)}`,
    `C${f(cx+a)},${f(cy+K*b)} ${f(cx+K*a)},${f(cy+b)} ${f(cx)},${f(cy+b)}`,
    `C${f(cx-K*a)},${f(cy+b)} ${f(cx-a)},${f(cy+K*b)} ${f(cx-a)},${f(cy)}`,
  ].join('');
}

// Outline = full silhouette border: top ellipse + side edges + bottom front arc
function outlineLine(rt, zt, rb, zb) {
  return frustumFill(rt, zt, rb, zb); // same shape, used as a stroke path
}

// Generate complete solid group for one frustum assembly
function solidGroup(id, rt, zt, rb, zb, extraShade = '') {
  const fill = frustumFill(rt, zt, rb, zb);
  const right = frustumRight(rt, zt, rb, zb);
  const left = frustumLeft(rt, zt, rb, zb);
  const top = topEllipse(rt, zt);
  const crease = creaseLine(rt, zt);
  const edge = outlineLine(rt, zt, rb, zb);

  return `<g data-asm="${id}"><g class="iso-solid"><path class="iso-fill" d="${fill}"/><path class="iso-shade" data-shade="0" d="${right}"/><path class="iso-shade" data-shade="3" d="${left}"/>${extraShade}<path class="iso-top" d="${top}"/><path class="iso-line iso-crease" data-tone="faint" d="${crease}"/><path class="iso-line iso-edge" data-tone="mid" d="${edge}"/></g></g>`;
}

// Halo glow under the nozzle
function haloPath(r, z) {
  const { cx, cy, a, b } = E(r, z);
  return `<path class="iso-halo" d="${frustumFill(r, z, r, z - 4)}"/>`;
}

// Horizontal band (a thin ring for structural ribs / hoops)
function ringBand(r, z_top, z_bot, shade) {
  const T = E(r, z_top), B = E(r, z_bot), cx = CX;
  const right = frustumRight(r, z_top, r, z_bot);
  const left = frustumLeft(r, z_top, r, z_bot);
  const top = topEllipse(r, z_top);
  return `<g class="iso-solid"><path class="iso-fill" d="${frustumFill(r, z_top, r, z_bot)}"/><path class="iso-shade" data-shade="${shade}" d="${right}"/><path class="iso-shade" data-shade="${shade > 0 ? shade - 1 : 0}" d="${left}"/><path class="iso-top" d="${top}"/><path class="iso-line iso-edge" data-tone="lo" d="${outlineLine(r, z_top, r, z_bot)}"/></g>`;
}

// Small dot grid on top face (like chip pins)
function topDots(r, z, spacing = 7, dotR = 0.55) {
  const { cx, cy } = E(r * 0.6, z);
  const dots = [];
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      if (Math.abs(i) + Math.abs(j) > 3) continue;
      const wx = i * spacing, wy = j * spacing;
      const sx = CX + (wx - wy) * S;
      const sy = CY - z * S + (wx + wy) * S * 0.5;
      dots.push(`<circle cx="${f(sx)}" cy="${f(sy)}" r="${dotR}"/>`);
    }
  }
  return `<g class="iso-dots" data-tone="lo">${dots.join('')}</g>`;
}

// Vertical pipe on the side of the engine
function sidePipe(wx, wy, z_bot, z_top, r) {
  const T = E(r, z_top), B = E(r, z_bot);
  const sx_offset = (wx - wy) * S;
  const sy_offset = (wx + wy) * S * 0.5;
  const pcx = CX + sx_offset;
  const top_cy = CY - z_top * S + sy_offset;
  const bot_cy = CY - z_bot * S + sy_offset;
  const a = r * A_PER_R, b = r * B_PER_R;

  const pTop = `M${f(pcx+a)},${f(top_cy)} C${f(pcx+a)},${f(top_cy-K*b)} ${f(pcx+K*a)},${f(top_cy-b)} ${f(pcx)},${f(top_cy-b)} C${f(pcx-K*a)},${f(top_cy-b)} ${f(pcx-a)},${f(top_cy-K*b)} ${f(pcx-a)},${f(top_cy)} C${f(pcx-a)},${f(top_cy+K*b)} ${f(pcx-K*a)},${f(top_cy+b)} ${f(pcx)},${f(top_cy+b)} C${f(pcx+K*a)},${f(top_cy+b)} ${f(pcx+a)},${f(top_cy+K*b)} ${f(pcx+a)},${f(top_cy)}Z`;
  const pFill = `M${f(pcx+a)},${f(top_cy)} C${f(pcx+a)},${f(top_cy-K*b)} ${f(pcx+K*a)},${f(top_cy-b)} ${f(pcx)},${f(top_cy-b)} C${f(pcx-K*a)},${f(top_cy-b)} ${f(pcx-a)},${f(top_cy-K*b)} ${f(pcx-a)},${f(top_cy)} L${f(pcx-a)},${f(bot_cy)} C${f(pcx-a)},${f(bot_cy+K*b)} ${f(pcx-K*a)},${f(bot_cy+b)} ${f(pcx)},${f(bot_cy+b)} C${f(pcx+K*a)},${f(bot_cy+b)} ${f(pcx+a)},${f(bot_cy+K*b)} ${f(pcx+a)},${f(bot_cy)} Z`;

  return `<g class="iso-solid"><path class="iso-fill" d="${pFill}"/><path class="iso-top" d="${pTop}"/><path class="iso-line iso-edge" data-tone="lo" d="${pFill}"/></g>`;
}

// ─── Engine geometry ───────────────────────────────────────────────────────────

// Parts: nozzle, chamber, collar, turbopump
// z = 0 is the nozzle-chamber interface (bottom of chamber / top of nozzle)

const NOZZLE_Z0  = -58, NOZZLE_R0  = 68; // nozzle exit (bottom)
const NOZZLE_Z1  =   0, NOZZLE_R1  = 32; // nozzle throat (top)

const CHAMBER_Z0 =   0, CHAMBER_R  = 32;
const CHAMBER_Z1 =  40;

const COLLAR_Z0  =  40, COLLAR_R   = 40; // slightly wider manifold ring
const COLLAR_Z1  =  50;

const PUMP_Z0    =  50, PUMP_R     = 27;
const PUMP_Z1    =  88;

// Nozzle structural hoops (rings along the bell)
const HOOP_Z_VALUES = [-10, -22, -36, -48];
const HOOP_WIDTH = 2; // world units wide

// Turbopump dome (hemispherical cap approximated as a very short cylinder)
const DOME_Z0    =  88, DOME_R     = 22;
const DOME_Z1    =  94;

// Small collar at chamber-nozzle junction
const JUNCT_Z0   =  -2, JUNCT_R    = 36;
const JUNCT_Z1   =   2;

// ─── Assemble SVG ─────────────────────────────────────────────────────────────

// Painter's order: back (turbopump/dome, highest Z) → front (nozzle, lowest Z)

// Dome (part of turbopump group)
const domeGroup = `<g class="iso-solid">
<path class="iso-fill" d="${frustumFill(DOME_R, DOME_Z1, PUMP_R, DOME_Z0)}"/>
<path class="iso-shade" data-shade="0" d="${frustumRight(DOME_R, DOME_Z1, PUMP_R, DOME_Z0)}"/>
<path class="iso-shade" data-shade="3" d="${frustumLeft(DOME_R, DOME_Z1, PUMP_R, DOME_Z0)}"/>
<path class="iso-top" d="${topEllipse(DOME_R, DOME_Z1)}"/>
<path class="iso-line iso-edge" data-tone="mid" d="${outlineLine(DOME_R, DOME_Z1, PUMP_R, DOME_Z0)}"/>
</g>`;

// Turbopump ring detail
const pumpRing1 = ringBand(PUMP_R, PUMP_Z0 + 10, PUMP_Z0 + 13, '1');
const pumpRing2 = ringBand(PUMP_R, PUMP_Z0 + 22, PUMP_Z0 + 25, '1');

// Dot grid on turbopump top
const pumpDots = topDots(PUMP_R, PUMP_Z1, 6, 0.45);

// Turbopump assembly (drawn first = behind)
const turbopumpSVG = `<g data-asm="turbopump">
<g class="iso-solid">
<path class="iso-fill" d="${frustumFill(PUMP_R, PUMP_Z1, PUMP_R, PUMP_Z0)}"/>
<path class="iso-shade" data-shade="0" d="${frustumRight(PUMP_R, PUMP_Z1, PUMP_R, PUMP_Z0)}"/>
<path class="iso-shade" data-shade="3" d="${frustumLeft(PUMP_R, PUMP_Z1, PUMP_R, PUMP_Z0)}"/>
<path class="iso-top" d="${topEllipse(PUMP_R, PUMP_Z1)}"/>
<path class="iso-line iso-crease" data-tone="faint" d="${creaseLine(PUMP_R, PUMP_Z1)}"/>
<path class="iso-line iso-edge" data-tone="mid" d="${outlineLine(PUMP_R, PUMP_Z1, PUMP_R, PUMP_Z0)}"/>
</g>
${pumpRing1}
${pumpRing2}
${pumpDots}
${domeGroup}
</g>`;

// Collar/manifold
const collarSVG = solidGroup('collar', COLLAR_R, COLLAR_Z1, COLLAR_R, COLLAR_Z0);

// Chamber hoops detail
const chamberHoop1 = ringBand(CHAMBER_R, CHAMBER_Z0 + 8,  CHAMBER_Z0 + 11, '1');
const chamberHoop2 = ringBand(CHAMBER_R, CHAMBER_Z0 + 20, CHAMBER_Z0 + 23, '1');
const chamberHoop3 = ringBand(CHAMBER_R, CHAMBER_Z0 + 31, CHAMBER_Z0 + 34, '1');

// Junction ring at nozzle-chamber interface
const junctionSVG = `<g class="iso-solid">
<path class="iso-fill" d="${frustumFill(JUNCT_R, JUNCT_Z1, JUNCT_R, JUNCT_Z0)}"/>
<path class="iso-shade" data-shade="0" d="${frustumRight(JUNCT_R, JUNCT_Z1, JUNCT_R, JUNCT_Z0)}"/>
<path class="iso-shade" data-shade="3" d="${frustumLeft(JUNCT_R, JUNCT_Z1, JUNCT_R, JUNCT_Z0)}"/>
<path class="iso-top" d="${topEllipse(JUNCT_R, JUNCT_Z1)}"/>
<path class="iso-line iso-edge" data-tone="mid" d="${outlineLine(JUNCT_R, JUNCT_Z1, JUNCT_R, JUNCT_Z0)}"/>
</g>`;

// Chamber
const chamberSVG = `<g data-asm="chamber">
<g class="iso-solid">
<path class="iso-fill" d="${frustumFill(CHAMBER_R, CHAMBER_Z1, CHAMBER_R, CHAMBER_Z0)}"/>
<path class="iso-shade" data-shade="0" d="${frustumRight(CHAMBER_R, CHAMBER_Z1, CHAMBER_R, CHAMBER_Z0)}"/>
<path class="iso-shade" data-shade="3" d="${frustumLeft(CHAMBER_R, CHAMBER_Z1, CHAMBER_R, CHAMBER_Z0)}"/>
<path class="iso-top" d="${topEllipse(CHAMBER_R, CHAMBER_Z1)}"/>
<path class="iso-line iso-crease" data-tone="faint" d="${creaseLine(CHAMBER_R, CHAMBER_Z1)}"/>
<path class="iso-line iso-edge" data-tone="mid" d="${outlineLine(CHAMBER_R, CHAMBER_Z1, CHAMBER_R, CHAMBER_Z0)}"/>
</g>
${chamberHoop1}
${chamberHoop2}
${chamberHoop3}
${junctionSVG}
</g>`;

// Nozzle bell hoops
const nozzleHoops = HOOP_Z_VALUES.map(z =>
  ringBand(
    // radius at this z (linear interpolation)
    NOZZLE_R1 + (NOZZLE_R0 - NOZZLE_R1) * (NOZZLE_Z1 - z) / (NOZZLE_Z1 - NOZZLE_Z0) + 2,
    z + HOOP_WIDTH / 2, z - HOOP_WIDTH / 2, '1'
  )
).join('\n');

// Nozzle exit ring (thin lip at the very bottom)
const exitRing = ringBand(NOZZLE_R0 + 1.5, NOZZLE_Z0 + 2, NOZZLE_Z0, '0');

// Halo under nozzle
const halo = `<path class="iso-halo" d="${frustumFill(NOZZLE_R0, NOZZLE_Z0 + 3, NOZZLE_R0, NOZZLE_Z0 - 2)}"/>`;

// Nozzle
const nozzleSVG = `<g data-asm="nozzle">
${halo}
<g class="iso-solid">
<path class="iso-fill" d="${frustumFill(NOZZLE_R1, NOZZLE_Z1, NOZZLE_R0, NOZZLE_Z0)}"/>
<path class="iso-shade" data-shade="0" d="${frustumRight(NOZZLE_R1, NOZZLE_Z1, NOZZLE_R0, NOZZLE_Z0)}"/>
<path class="iso-shade" data-shade="3" d="${frustumLeft(NOZZLE_R1, NOZZLE_Z1, NOZZLE_R0, NOZZLE_Z0)}"/>
<path class="iso-line iso-crease" data-tone="faint" d="${creaseLine(NOZZLE_R1, NOZZLE_Z1)}"/>
<path class="iso-line iso-edge" data-tone="hi" d="${outlineLine(NOZZLE_R1, NOZZLE_Z1, NOZZLE_R0, NOZZLE_Z0)}"/>
</g>
${nozzleHoops}
${exitRing}
</g>`;

// Full SVG
const fullSVG = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg" viewBox="0 70 ${SVG_W} ${SVG_H}" role="img" aria-label="An exploded rocket engine: nozzle bell, combustion chamber, propellant manifold, and turbopump assembly.">${turbopumpSVG}${collarSVG}${chamberSVG}${nozzleSVG}</svg>`;

// Card version (same, just smaller viewBox without extra margin)
const CARD_VB = `0 100 ${SVG_W} 440`;
const cardSVG = fullSVG.replace(`viewBox="0 70 ${SVG_W} ${SVG_H}"`, `viewBox="${CARD_VB}"`);

// Write TypeScript output
const ts = `export const ROCKET_UP: [number, number] = [0, -1.45];

export const ROCKET_CARD_SVG = ${JSON.stringify(cardSVG)};
`;

import { writeFileSync } from 'fs';
writeFileSync(
  new URL('../src/components/illustrations/rocket-explode-markup.ts', import.meta.url),
  ts, 'utf8'
);
console.log('Written: src/components/illustrations/rocket-explode-markup.ts');
console.log('ViewBox:', CARD_VB);
console.log('SVG length:', cardSVG.length, 'chars');
