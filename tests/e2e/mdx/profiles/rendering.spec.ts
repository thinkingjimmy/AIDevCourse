import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockEmbeds } from '../embeds/fixtures';

const lesson = '/zh/courses/llm-101/ai-chat-tips';
const usernames = ['karpathy', 'poteto', 'theo', 'mattpocockuk', 'op7418', 'trq212', 'lennysan', 'dotey'];
test.skip(process.env.CONTENT_TEST === '1', 'Uses the published AI chat tips lesson.');

for (const scenario of [
  { name: 'desktop', width: 1440, fontSize: 16, javaScriptEnabled: true },
  { name: 'phone', width: 390, fontSize: 16, javaScriptEnabled: true },
  { name: 'narrow', width: 320, fontSize: 16, javaScriptEnabled: true },
  { name: 'enlarged', width: 390, fontSize: 24, javaScriptEnabled: true },
  { name: 'no-js', width: 390, fontSize: 16, javaScriptEnabled: false },
]) {
  test(`X recommendations show local avatars and open profiles in a new tab on ${scenario.name}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width: scenario.width, height: 960 },
      javaScriptEnabled: scenario.javaScriptEnabled, hasTouch: scenario.width < 961, reducedMotion: 'reduce' });
    try {
      await context.route('https://x.com/*', route => route.fulfill({ contentType: 'text/html', body: '<title>X profile</title>' }));
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await mockEmbeds(page);
      expect((await page.goto(lesson))?.status()).toBe(200);
      if (scenario.javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
      if (scenario.fontSize !== 16) await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, scenario.fontSize);
      const profiles = page.locator('[data-component="x-profiles"]');
      const cards = profiles.locator('[data-component="x-profile"]');
      await expect(cards).toHaveCount(usernames.length);
      await expect(profiles.getByRole('listitem')).toHaveCount(usernames.length);
      const evidence = [];
      for (const [index, username] of usernames.entries()) {
        const card = cards.nth(index);
        await card.scrollIntoViewIfNeeded();
        await expect(card).toHaveAttribute('href', `https://x.com/${username}`);
        await expect(card).toHaveAttribute('target', '_blank');
        await expect(card).toHaveAttribute('rel', 'noopener noreferrer');
        await expect(card).toHaveAccessibleName(new RegExp(`@${username}`));
        await expect(card).toHaveAccessibleDescription(/在新标签页打开/);
        await expect(card.locator('[data-slot="profile-name"]')).not.toBeEmpty();
        await expect(card.locator('[data-slot="profile-bio"]')).not.toBeEmpty();
        const avatar = card.locator('img');
        await expect(avatar).toHaveAttribute('alt', '');
        await expect.poll(() => avatar.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
        expect(await avatar.getAttribute('src')).not.toMatch(/^https?:/);
        expect(await card.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        evidence.push({ username, name: await card.locator('[data-slot="profile-name"]').textContent(), bio: await card.locator('[data-slot="profile-bio"]').textContent() });
      }
      const columns = await profiles.locator('ul').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
      expect(columns).toBe(scenario.name === 'desktop' ? 2 : 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const captureHeight = Math.max(960, Math.ceil((await profiles.boundingBox())!.height) + 160);
      await page.setViewportSize({ width: scenario.width, height: captureHeight });
      await profiles.scrollIntoViewIfNeeded();
      await testInfo.attach(`X recommendations ${scenario.name}`, { body: await profiles.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
      await page.setViewportSize({ width: scenario.width, height: 960 });
      await testInfo.attach('Profile content and layout', { body: JSON.stringify({ columns, profiles: evidence }, null, 2), contentType: 'application/json' });
      if (scenario.javaScriptEnabled) {
        const accessibility = await new AxeBuilder({ page }).include('[data-component="x-profiles"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
      const first = cards.first();
      await first.focus();
      await expect(first).toBeFocused();
      await expect(first).toHaveCSS('outline-style', 'solid');
      const popupReady = context.waitForEvent('page');
      if (scenario.width < 961) await first.tap();
      else await first.press('Enter');
      const popup = await popupReady;
      await popup.waitForURL('https://x.com/karpathy');
      expect(await popup.evaluate(() => window.opener === null)).toBe(true);
      await expect(page).toHaveURL(new RegExp(`${lesson}$`));
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}
