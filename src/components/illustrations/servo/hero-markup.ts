import { SERVO_CARD_SVG, SERVO_CALLOUTS } from './markup';

const escapeText = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export const SERVO_HERO_SVG = SERVO_CALLOUTS.reduce<string>((svg, { part, title, description, x, y }) => {
  const start = svg.indexOf(`<g data-part="${part}"`);
  const insertion = svg.indexOf('>', start) + 1;
  // Keep each leader with its physical part while it moves and fades.
  const label = `<g class="co"><circle class="co-dot" cx="${x}" cy="${y}" r="1.8"/><path class="co-line" d="M${x} ${y}H424"/><text class="co-title" x="430" y="${y - 1}">${escapeText(title)}</text><text class="co-sub" x="430" y="${y + 11}">${escapeText(description)}</text></g>`;
  return svg.slice(0, insertion) + label + svg.slice(insertion);
}, SERVO_CARD_SVG.replace('viewBox="100 50 400 420"', 'viewBox="160 50 460 420"'));
