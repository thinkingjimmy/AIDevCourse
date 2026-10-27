/**
 * [INPUT]: Exploded-chip SVG markup for the course hero and the catalog card.
 * [OUTPUT]: Regression coverage that the card drops leader lines and names while the hero keeps them.
 * [POS]: Illustration markup checks, independent of the browser.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHIP_CARD_SVG, CHIP_CARD_VIEWBOX, CHIP_EXPLODE_SVG } from '../../src/components/illustrations/chip-explode-markup';

function groups(svg: string) {
  return svg.match(/<g[\s>]/g)?.length ?? 0;
}

describe('exploded chip markup', () => {
  it('keeps six leader labels on the hero and removes them from the card frame', () => {
    expect(CHIP_EXPLODE_SVG.match(/<g class="co">/g)).toHaveLength(6);
    expect(CHIP_EXPLODE_SVG).toContain('>Cooler<');
    expect(CHIP_EXPLODE_SVG).toContain('viewBox="20 -180 720 570"');
    expect(CHIP_CARD_SVG).not.toContain('class="co"');
    expect(CHIP_CARD_SVG).not.toContain('Cooler');
    expect(CHIP_CARD_SVG).toContain(`viewBox="${CHIP_CARD_VIEWBOX}"`);
    expect(CHIP_CARD_SVG).toContain('data-asm="fan"');
    expect(CHIP_CARD_SVG).toContain('data-asm="board"');
    expect(groups(CHIP_EXPLODE_SVG) - groups(CHIP_CARD_SVG)).toBe(6);
    expect(groups(CHIP_CARD_SVG)).toBe((CHIP_CARD_SVG.match(/<\/g>/g) ?? []).length);
    const [, , width, height] = CHIP_CARD_VIEWBOX.split(' ');
    const card = readFileSync('src/components/course/course-card.tsx', 'utf8');
    const hero = readFileSync('src/app/[lang]/courses/[course]/page.tsx', 'utf8');
    expect(card).toContain(`aspect-[${width}/${height}]`);
    expect(card).toContain('callouts={false}');
    expect(hero).toContain('<ChipExplode callouts />');
  });
});
