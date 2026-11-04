import { expect, test, type Locator } from '@playwright/test';

async function measureConnection(card: Locator) {
  return card.evaluate(element => {
    const id = element.getAttribute('data-jimmy-note-card')!;
    const anchor = document.querySelector<HTMLElement>(`[data-jimmy-note-anchor="${id}"]`)!;
    const image = anchor.dataset.noteAnchorVariant === 'image';
    const fragments = [...anchor.getClientRects()];
    const last = image ? fragments[0] : fragments.at(-1)!;
    const path = element.querySelector<SVGPathElement>('[data-note-connector]')!;
    const matrix = path.getScreenCTM()!;
    const length = path.getTotalLength();
    const start = path.getPointAtLength(0).matrixTransform(matrix);
    const end = path.getPointAtLength(length).matrixTransform(matrix);
    const tail = path.getPointAtLength(Math.max(0, length - 2)).matrixTransform(matrix);
    const dot = element.querySelector<SVGCircleElement>('circle')!;
    const point = new DOMPoint(dot.cx.baseVal.value, dot.cy.baseVal.value).matrixTransform(matrix);
    const body = element.querySelector<HTMLElement>('[data-component="jimmy-note"]')!;
    const bounds = body.getBoundingClientRect();
    const style = getComputedStyle(body);
    const signature = body.querySelector('[data-slot="note-signature"]')!.getBoundingClientRect();
    const borderWidth = parseFloat(style.borderLeftWidth);
    const stroke = getComputedStyle(path);
    const context = document.createElement('canvas').getContext('2d')!;
    context.fillStyle = stroke.stroke;
    context.fillRect(0, 0, 1, 1);
    const rgb = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    const rectangles: DOMRect[] = [];
    const article = anchor.closest('article')!;
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      rectangles.push(...[...range.getClientRects()].filter(rect => rect.width && rect.height));
    }
    let textIntersections = 0;
    for (let distance = 0; distance <= length; distance += 0.75) {
      const position = path.getPointAtLength(distance).matrixTransform(matrix);
      if (rectangles.some(rect => position.x > rect.left - 0.7 && position.x < rect.right + 0.7 && position.y > rect.top - 0.7 && position.y < rect.bottom + 0.7)) textIntersections++;
    }
    const radius = dot.r.baseVal.value;
    const pointIntersections = rectangles.filter(rect => point.x + radius > rect.left && point.x - radius < rect.right && point.y + radius > rect.top && point.y - radius < rect.bottom).length;
    return {
      id, image, fragments: fragments.length, anchor: last.toJSON(), card: bounds.toJSON(),
      start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y },
      startXError: Math.abs(start.x - last.right - (image ? 4 : 5)),
      sourceOffset: image ? Math.abs(start.y - last.top - last.height / 2) : start.y - last.bottom,
      endXError: Math.abs(end.x - bounds.left - borderWidth / 2), entryY: end.y, headerBottom: signature.bottom,
      dotError: Math.hypot(start.x - point.x, start.y - point.y),
      tailRise: Math.abs(end.y - tail.y), length, textIntersections, pointIntersections,
      borderWidth, strokeWidth: parseFloat(stroke.strokeWidth), border: style.borderLeftColor,
      stroke: stroke.stroke, radius: style.borderRadius, rootFontSize: parseFloat(getComputedStyle(document.documentElement).fontSize), shadow: style.boxShadow, rgb,
    };
  });
}

export async function verifyConnection(card: Locator) {
  await expect(card.locator('[data-note-connector]')).toHaveAttribute('d', /^M /);
  let geometry: Awaited<ReturnType<typeof measureConnection>> | undefined;
  try {
    await expect(async () => {
      geometry = await measureConnection(card);
      expect(geometry.startXError).toBeLessThan(1);
      // The inset can be tuned; the line must enter the left edge within the author header.
      expect(geometry.endXError).toBeLessThan(0.2);
      expect(geometry.entryY).toBeGreaterThan(geometry.card.top);
      expect(geometry.entryY).toBeLessThan(geometry.headerBottom);
      expect(geometry.dotError).toBeLessThan(0.2);
      if (geometry.image) expect(geometry.sourceOffset).toBeLessThan(1);
      else {
        expect(geometry.sourceOffset).toBeGreaterThan(1);
        expect(geometry.sourceOffset).toBeLessThan(12);
        expect(geometry.tailRise).toBeLessThan(0.1);
      }
      expect(geometry.textIntersections, `${geometry.id}: connector crosses text`).toBe(0);
      expect(geometry.pointIntersections, `${geometry.id}: dot overlaps text`).toBe(0);
      expect(geometry.strokeWidth).toBe(geometry.borderWidth);
      expect(geometry.stroke).toBe(geometry.border);
      expect(geometry.radius).toBe(`${geometry.rootFontSize / 4}px`);
      expect(geometry.shadow).not.toBe('none');
      for (const [index, channel] of [243, 134, 24].entries()) expect(Math.abs(geometry.rgb[index] - channel)).toBeLessThanOrEqual(2);
    }).toPass({ timeout: 5000 });
  } catch (error) {
    await test.info().attach('failed connection geometry', { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
    throw error;
  }
  await test.info().attach(`${geometry!.id} connection`, { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
  return geometry!;
}
