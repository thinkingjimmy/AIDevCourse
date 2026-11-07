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
  });
});
