import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const lesson = '/zh/courses/llm-101/what-a-language-model-does';
const channels = [
  { name: 'star', label: '在 GitHub 为本项目加 Star', href: 'https://github.com/thinkingjimmy/aidevcourse' },
  { name: 'xiaohongshu', label: '关注小红书', href: 'https://www.xiaohongshu.com/user/profile/6073d38d00000000010068a6' },
  { name: 'x', label: '关注 X', href: 'https://x.com/thinkingjimmy' },
  { name: 'bilibili', label: '关注哔哩哔哩', href: 'https://space.bilibili.com/1409205119' },
];

async function capture(page: Page, name: string) {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, animations: 'disabled' });
  await test.info().attach(name, { path, contentType: 'image/png' });
  const geometry = await page.locator('[data-slot="note-author-actions"], [data-slot="note-wechat-popover"], [data-slot="jimmy-note-popover"]').evaluateAll(elements => elements.filter(element => element.getClientRects().length).map(element => ({
    slot: element.getAttribute('data-slot'), bounds: element.getBoundingClientRect().toJSON(), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth,
  })));
  await test.info().attach(`${name} geometry`, { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
}

async function verifyQr(page: Page) {
  const popover = page.locator('[data-slot="note-wechat-popover"]');
  await expect(popover).toBeVisible();
  await expect(popover).toContainText('也可以在微信找到我');
  await expect(popover.getByRole('img', { name: '公众号二维码占位，暂不可扫描' })).toBeVisible();
  const bounds = (await popover.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
  const accessibility = await new AxeBuilder({ page }).include('[data-slot="note-wechat-popover"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  return popover;
}

test.describe('JimmyNote author actions', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'Uses published lessons.');

  test('shows five compact borderless icons with the correct links and a keyboard QR popover', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 1536, height: 960 });
    await page.goto(lesson);
    const note = page.locator('[data-jimmy-note-card="streaming-answer"]');
    await note.scrollIntoViewIfNeeded();
    const header = note.locator('[data-slot="note-signature"]');
    await expect(header.getByText('本文作者', { exact: true })).toBeVisible();
    const name = (await header.getByText('Jimmy', { exact: true }).boundingBox())!;
    const role = (await header.getByText('本文作者', { exact: true }).boundingBox())!;
    expect(role.y).toBeGreaterThan(name.y);
    expect(role.x).toBeCloseTo(name.x, 0);
    const actions = header.locator('[data-slot="note-author-actions"]');
    const avatar = (await header.locator('img').boundingBox())!;
    const actionRow = (await actions.boundingBox())!;
    expect(Math.abs(avatar.y + avatar.height / 2 - actionRow.y - actionRow.height / 2)).toBeLessThan(1);
    await expect(actions.locator('[data-note-author-action]')).toHaveCount(5);
    expect(await actions.locator('[data-note-author-action]').evaluateAll(elements => elements.map(element => element.getAttribute('data-note-author-action')))).toEqual([...channels.map(channel => channel.name), 'wechat']);
    for (const channel of channels) {
      const link = actions.getByRole('link', { name: channel.label, exact: true });
      await expect(link).toHaveAttribute('href', channel.href);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    const controls = await actions.locator('[data-note-author-action]').evaluateAll(elements => elements.map(element => {
      const content = element.cloneNode(true) as HTMLElement;
      content.querySelectorAll('svg').forEach(icon => icon.remove());
      return { text: content.textContent?.trim(), border: getComputedStyle(element).borderTopWidth, rect: element.getBoundingClientRect().toJSON() };
    }));
    for (const control of controls) {
      expect(control.text).toBe('');
      expect(control.border).toBe('0px');
      expect(control.rect.width).toBeCloseTo(32, 2);
      expect(control.rect.height).toBeCloseTo(32, 2);
    }
    await expect(actions.locator('[data-note-author-action="star"] svg')).toHaveAttribute('width', '16');
    const icons = actions.locator('[data-note-author-action] svg[data-author-action-icon]');
    await expect(icons).toHaveCount(5);
    expect(await icons.evaluateAll(elements => elements.map(element => ({ stroke: element.getAttribute('stroke'), width: element.getAttribute('stroke-width'), cap: element.getAttribute('stroke-linecap') })))).toEqual(Array.from({ length: 5 }, () => ({ stroke: 'currentColor', width: '1.5', cap: 'round' })));
    await expect(header.getByRole('button', { name: '关于本文作者' })).toHaveCount(0);
    await capture(page, 'jimmy-note-social-header');
    const detail = test.info().outputPath('jimmy-note-social-header-detail.png');
    await note.screenshot({ path: detail });
    await test.info().attach('Social header detail', { path: detail, contentType: 'image/png' });
    const trigger = actions.getByRole('button', { name: '查看公众号二维码' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await verifyQr(page);
    await capture(page, 'jimmy-note-qr-keyboard');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-slot="note-wechat-popover"]')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
  });

  test('keeps a hover QR preview open while crossing the gap and pins it on click', async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 960 });
    await page.goto(lesson);
    const note = page.locator('[data-jimmy-note-card="streaming-answer"]');
    await note.scrollIntoViewIfNeeded();
    const trigger = note.getByRole('button', { name: '查看公众号二维码' });
    await trigger.hover();
    const qr = await verifyQr(page);
    await expect(trigger).not.toBeFocused();
    await qr.hover();
    await expect(qr).toBeVisible();
    await page.mouse.move(1, 1);
    await expect(qr).toHaveCount(0);
    await trigger.hover();
    await expect(qr).toBeVisible();
    await trigger.click();
    await page.mouse.move(1, 1);
    await expect(qr).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(qr).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  for (const scenario of [
    { name: 'mobile', width: 390, height: 844, fontSize: 16 },
    { name: 'narrow', width: 320, height: 568, fontSize: 16 },
    { name: 'enlarged', width: 390, height: 844, fontSize: 24 },
    { name: 'short', width: 390, height: 360, fontSize: 16 },
  ]) {
    test(`retains the floating note when opening and dismissing QR details on ${scenario.name}`, async ({ page }) => {
      await page.setViewportSize(scenario);
      await page.goto(lesson);
      await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, scenario.fontSize);
      const comment = page.locator('[data-note-trigger-for="streaming-answer"]');
      await comment.click();
      const popover = page.locator('[data-slot="jimmy-note-popover"]');
      const trigger = popover.getByRole('button', { name: '查看公众号二维码' });
      await expect(popover.getByText('本文作者', { exact: true })).toBeVisible();
      await expect(trigger).toBeVisible();
      const avatar = (await popover.locator('[data-slot="note-signature"] img').boundingBox())!;
      const actions = (await popover.locator('[data-slot="note-author-actions"]').boundingBox())!;
      expect(Math.abs(actions.x - avatar.x)).toBeLessThan(1);
      expect(actions.y).toBeGreaterThan(avatar.y + avatar.height);
      expect(await popover.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      await trigger.click();
      await verifyQr(page);
      await expect(popover).toHaveCount(1);
      await capture(page, `jimmy-note-qr-${scenario.name}`);
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-slot="note-wechat-popover"]')).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect(popover).toBeVisible();
      await trigger.click();
      await expect(page.locator('[data-slot="note-wechat-popover"]')).toBeVisible();
      await page.mouse.click(1, 1);
      await expect(page.locator('[data-slot="note-wechat-popover"]')).toHaveCount(0);
      await expect(popover).toHaveCount(0);
    });
  }

  test('keeps touch controls at 44px without overlap', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      await page.goto(lesson);
      await page.locator('[data-note-trigger-for="streaming-answer"]').tap();
      const actions = page.locator('[data-slot="jimmy-note-popover"] [data-slot="note-author-actions"]');
      const bounds = await actions.locator('[data-note-author-action]').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()));
      expect(bounds).toHaveLength(5);
      for (const rect of bounds) {
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      }
      for (let index = 1; index < bounds.length; index++) expect(bounds[index].left).toBeGreaterThanOrEqual(bounds[index - 1].right - 1);
      await actions.getByRole('button', { name: '查看公众号二维码' }).tap();
      await verifyQr(page);
      await capture(page, 'jimmy-note-qr-touch');
    } finally { await context.close(); }
  });
});

test('previews and no-JavaScript notes expose social links and a native QR disclosure', async ({ page, browser, baseURL }) => {
  await page.setViewportSize({ width: 1536, height: 960 });
  await page.goto('/design/components');
  await page.locator('#jimmy-notes').getByRole('button', { name: '查看公众号二维码' }).first().click();
  await verifyQr(page);
  await page.keyboard.press('Escape');
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const native = await context.newPage();
    await native.goto('/design/components');
    const note = native.locator('#jimmy-notes').getByRole('note', { name: 'Jimmy', exact: true }).first();
    await expect(note.getByText('本文作者', { exact: true })).toBeVisible();
    for (const channel of channels) await expect(note.getByRole('link', { name: channel.label, exact: true })).toHaveAttribute('href', channel.href);
    await note.locator('summary[aria-label="查看公众号二维码"]').click();
    await expect(note.getByRole('img', { name: '公众号二维码占位，暂不可扫描' })).toBeVisible();
    await capture(native, 'jimmy-note-social-no-js');
  } finally { await context.close(); }
});
