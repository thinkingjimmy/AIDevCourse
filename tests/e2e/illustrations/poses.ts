import { expect, type Locator } from '@playwright/test';

export async function expectAssembled(figure: Locator) {
  await expect.poll(() => figure.locator('[data-asm]:not([data-asm="cable"]), [data-key], [data-part]')
    .evaluateAll(parts => parts.length > 0 && parts.every(part => !part.getAttribute('transform')))).toBe(true);
  await expect(figure).toHaveAttribute('data-settled', 'false');
}

export async function expectStill(figure: Locator, duration = 2000) {
  const changes = await figure.evaluate((element, duration) => new Promise<number>(resolve => {
    let changes = 0;
    const observer = new MutationObserver(records => {
      changes += records.filter(record => record.oldValue !== (record.target as Element).getAttribute(record.attributeName!)).length;
    });
    observer.observe(element, { subtree: true, attributes: true, attributeOldValue: true,
      attributeFilter: ['transform', 'data-progress', 'data-settled'] });
    setTimeout(() => { observer.disconnect(); resolve(changes); }, duration);
  }), duration);
  expect(changes).toBe(0);
}
