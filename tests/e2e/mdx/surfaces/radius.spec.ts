import { test, expect, type Locator } from '@playwright/test';
import { mockEmbeds } from '../embeds/fixtures';

test.skip(process.env.CONTENT_TEST === '1', 'Uses published lessons and the component preview.');
test.use({ reducedMotion: 'reduce' });

async function expectSmallRadius(elements: Locator) {
  await expect(elements.first()).toBeAttached();
  for (const element of await elements.all()) await expect(element).toHaveCSS('border-radius', '4px');
}

for (const width of [1440, 390]) {
  test(`lesson frames and completion use small corners at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    const lesson = '/zh/courses/llm-101/what-a-language-model-does';
    await page.goto(lesson);
    const menu = page.getByRole('figure', { name: '两种菜单对比' });
    await expectSmallRadius(menu);
    await expectSmallRadius(menu.locator('select, button'));
    await menu.getByRole('button').click();
    const popup = page.getByRole('menu', { name: '打开 shadcn 菜单，请点击', exact: true });
    await expectSmallRadius(popup);
    await expectSmallRadius(popup.getByRole('menuitem'));
    await page.keyboard.press('Escape');

    await expectSmallRadius(page.getByRole('note', { name: '划重点', exact: true }));
    const challenge = page.locator('[data-achievement="input-shapes-output"]');
    await expectSmallRadius(challenge);
    await expectSmallRadius(challenge.locator('label'));
    await challenge.getByRole('radio').first().click();
    await expectSmallRadius(challenge.locator('[data-answer-feedback="incorrect"]'));
    await challenge.getByRole('radio').nth(1).click();
    await expect(challenge).toHaveAttribute('data-state', 'unlocked');
    await expectSmallRadius(challenge.getByRole('button'));
    await challenge.getByRole('button', { name: '查看所有成就', exact: true }).click();
    const gallery = page.getByRole('dialog', { name: '我的成就', exact: true });
    await expectSmallRadius(gallery);
    await expectSmallRadius(gallery.locator('[data-medal-emblem], [data-medal-link], button'));
    await page.keyboard.press('Escape');

    const complete = page.getByRole('button', { name: '标记为已完成', exact: true });
    await expectSmallRadius(complete);
    await complete.click();
    await expect(page).not.toHaveURL(lesson);
    await page.goto(lesson);
    const next = page.getByRole('button', { name: '下一章', exact: true });
    await expectSmallRadius(next);
    await challenge.getByRole('button', { name: '再试一次', exact: true }).click();
    await next.scrollIntoViewIfNeeded();
    await testInfo.attach(`challenge-and-next-${width}`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`MDX cards and portals use small corners at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await mockEmbeds(page, { script: 'abort' });
    await page.route('**/api/link-preview?**', route => route.fulfill({ status: 204 }));
    await page.goto('/design/components');
    for (const selector of [
      '#key-takeaways [role="note"]', '[data-component="mermaid"]', '#tables [data-slot="table-container"]',
      '[data-component="chat"]', '[data-slot="message-content"]:not(:has([data-slot="trace"])), [data-slot="message-response"]', '[data-slot="message-avatar"]',
      '[data-citation-trigger]', '[data-embed="youtube"] > div',
    ]) {
      const surfaces = page.locator(selector);
      await expectSmallRadius(selector.includes('table-container') ? surfaces.locator('..') : surfaces);
    }
    const tool = page.locator('#chat-tools [data-component="chat-tool-call"]');
    const trigger = tool.locator('[data-slot="trace-collapsible-trigger"]');
    await expectSmallRadius(trigger);
    await trigger.click();
    await expectSmallRadius(tool.locator('[data-slot="code-block"]'));
    await testInfo.attach(`chat-tools-${width}`, { body: await page.locator('#chat-tools').screenshot({ animations: 'disabled' }), contentType: 'image/png' });

    const notes = page.locator('#jimmy-notes');
    if (width < 1024) await notes.locator('[data-note-trigger-for]').first().click();
    const note = page.locator('[data-component="jimmy-note"]:visible').first();
    await expectSmallRadius(note);
    await expectSmallRadius(note.getByRole('button'));
    await testInfo.attach(`note-${width}`, { body: await note.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    await page.keyboard.press('Escape');

    await page.locator('#inline-citations [data-citation-trigger]').hover();
    await expectSmallRadius(page.locator('[data-component="inline-citation-preview"]'));
    await page.keyboard.press('Escape');
    await page.locator('#link-previews a').first().hover();
    await expectSmallRadius(page.locator('[data-slot="link-preview"]'));
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`MDX demos and code use small corners at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    for (const [slug, selector] of [
      ['llm-101/what-is-a-token', 'article figure.quote-frame'],
      ['llm-101/how-models-calculate-token-probabilities', '[data-token-probability-diagram], [data-probability-input], [data-probability-sampling], [data-score-candidate]'],
      ['llm-101/how-language-models-are-trained', '[data-pretraining-overview], [data-training-demo], [data-training-model], [data-training-demo] button, [data-pretraining-overview] button'],
      ['coding-101/animation-prompts', 'article figure.quote-frame, article figure:has(pre), article .copy-button'],
      ['coding-101/call-ai-with-json', 'article [role="note"], article figure:has(pre), article .copy-button'],
    ]) {
      await page.goto(`/zh/courses/${slug}`);
      await expectSmallRadius(page.locator(selector));
    }
    await testInfo.attach(`code-and-callout-${width}`, { body: await page.locator('article [role="note"]').first().screenshot({ animations: 'disabled' }), contentType: 'image/png' });
  });
}
